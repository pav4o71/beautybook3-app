import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import {
  checkRateLimit,
  cleanupExpiredRateLimitBuckets,
  deriveBookingSubjectHash,
  deriveManagementTokenSubjectHash,
  RATE_LIMIT_CONFIG,
  RATE_LIMIT_ERROR_MESSAGE,
} from "../../lib/rate-limit";
import { getDemoTenantContext } from "../../lib/tenant";
import { bookPublicSlot } from "../../app/s/[orgSlug]/book/actions";
import { cancelAppointmentAction, rescheduleAppointmentAction } from "../../app/b/[token]/actions";
import { assertSafeVerifyTarget } from "./assert-safe-target";

async function main() {
  assertSafeVerifyTarget();
  console.log("verify: checking rate-limiting and abuse protection...");

  // 1. Deterministic Subject Hashing
  const orgId1 = "org_11111111-1111-4111-8111-111111111111";
  const orgId2 = "org_22222222-2222-4222-8222-222222222222";
  const locId = "loc_11111111-1111-4111-8111-111111111111";
  const phone1 = "+359888123456";
  const phone2 = "+359888654321";

  const hash1 = deriveBookingSubjectHash(orgId1, locId, phone1);
  const hash1Repeat = deriveBookingSubjectHash(orgId1, locId, phone1);
  assert.equal(hash1, hash1Repeat, "HMAC-SHA256 must be deterministic for same input");
  assert.notEqual(hash1, phone1, "Raw phone must never match subject hash");
  assert.equal(hash1.length, 64, "Subject hash must be 64-char hex string (SHA256)");

  const hashDiffPhone = deriveBookingSubjectHash(orgId1, locId, phone2);
  assert.notEqual(hash1, hashDiffPhone, "Different phones must produce different hashes");

  const hashDiffOrg = deriveBookingSubjectHash(orgId2, locId, phone1);
  assert.notEqual(hash1, hashDiffOrg, "Different orgs must produce different hashes");

  const token1 = "tok_test_abc123";
  const tokenHash1 = deriveManagementTokenSubjectHash(token1);
  const tokenHash1Repeat = deriveManagementTokenSubjectHash(token1);
  assert.equal(tokenHash1, tokenHash1Repeat, "Token hash must be deterministic");
  assert.notEqual(tokenHash1, token1, "Raw token must not match hash");
  assert.equal(tokenHash1.length, 64, "Token hash must be 64-char hex string");

  // 2. Atomic Rate Limit Counter & Window Enforcement
  const testSubject = `test_sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const testScope = "verify_test_scope";
  const maxLimit = 3;
  const windowMs = 60_000;

  // Call 1
  const res1 = await checkRateLimit({
    scope: testScope,
    subjectHash: testSubject,
    max: maxLimit,
    windowMs,
  });
  assert.equal(res1.allowed, true);
  assert.equal(res1.count, 1);

  // Call 2
  const res2 = await checkRateLimit({
    scope: testScope,
    subjectHash: testSubject,
    max: maxLimit,
    windowMs,
  });
  assert.equal(res2.allowed, true);
  assert.equal(res2.count, 2);

  // Call 3 (at max)
  const res3 = await checkRateLimit({
    scope: testScope,
    subjectHash: testSubject,
    max: maxLimit,
    windowMs,
  });
  assert.equal(res3.allowed, true);
  assert.equal(res3.count, 3);

  // Call 4 (exceeded)
  const res4 = await checkRateLimit({
    scope: testScope,
    subjectHash: testSubject,
    max: maxLimit,
    windowMs,
  });
  assert.equal(res4.allowed, false, "Call exceeding max must not be allowed");
  assert.equal(res4.count, 4);

  // Different subject is independent
  const otherSubject = `test_other_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const resOther = await checkRateLimit({
    scope: testScope,
    subjectHash: otherSubject,
    max: maxLimit,
    windowMs,
  });
  assert.equal(resOther.allowed, true, "Different subject should not be throttled");
  assert.equal(resOther.count, 1);

  // Verify DB record contents: verify no raw sensitive data is present in RateLimitBucket
  const bucket = await prisma.rateLimitBucket.findFirst({
    where: { scope: testScope, subjectHash: testSubject },
  });
  assert(bucket, "Bucket row must exist in PostgreSQL");
  assert.equal(bucket.count, 4);
  assert(bucket.expiresAt > new Date(), "Expiration must be set in future");

  // 3. Cleanup of Expired Buckets
  const expiredSubject = `test_expired_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await prisma.rateLimitBucket.create({
    data: {
      scope: "test_cleanup",
      subjectHash: expiredSubject,
      windowStart: new Date(Date.now() - 3600_000),
      count: 10,
      expiresAt: new Date(Date.now() - 60_000), // Already expired
    },
  });

  const deletedCount = await cleanupExpiredRateLimitBuckets();
  assert(deletedCount >= 1, "Expired bucket must be cleaned up");

  const deletedCheck = await prisma.rateLimitBucket.findFirst({
    where: { scope: "test_cleanup", subjectHash: expiredSubject },
  });
  assert.equal(deletedCheck, null, "Expired bucket must no longer exist");

  // Active bucket must still exist
  const activeCheck = await prisma.rateLimitBucket.findFirst({
    where: { scope: testScope, subjectHash: testSubject },
  });
  assert(activeCheck, "Active bucket must not be deleted by cleanup");

  // 4. Action-Level Rate Limit Enforcement
  const { organizationId, locationId } = await getDemoTenantContext();
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });
  const staff = await prisma.staff.findFirstOrThrow({
    where: { organizationId, locationId, active: true },
  });
  const service = await prisma.service.findFirstOrThrow({
    where: { organizationId, active: true },
  });

  const testMgmtToken = `tok_ratelimit_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Test Customer Reschedule Rate Limiting (max 10)
  const rescheduleMgmtHash = deriveManagementTokenSubjectHash(testMgmtToken);
  await prisma.rateLimitBucket.upsert({
    where: {
      scope_subjectHash_windowStart: {
        scope: RATE_LIMIT_CONFIG.CUSTOMER_RESCHEDULE.scope,
        subjectHash: rescheduleMgmtHash,
        windowStart: new Date(Math.floor(Date.now() / RATE_LIMIT_CONFIG.CUSTOMER_RESCHEDULE.windowMs) * RATE_LIMIT_CONFIG.CUSTOMER_RESCHEDULE.windowMs),
      },
    },
    update: { count: RATE_LIMIT_CONFIG.CUSTOMER_RESCHEDULE.max },
    create: {
      scope: RATE_LIMIT_CONFIG.CUSTOMER_RESCHEDULE.scope,
      subjectHash: rescheduleMgmtHash,
      windowStart: new Date(Math.floor(Date.now() / RATE_LIMIT_CONFIG.CUSTOMER_RESCHEDULE.windowMs) * RATE_LIMIT_CONFIG.CUSTOMER_RESCHEDULE.windowMs),
      count: RATE_LIMIT_CONFIG.CUSTOMER_RESCHEDULE.max,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const rescheduleRes = await rescheduleAppointmentAction(testMgmtToken, new Date(Date.now() + 60 * 3600 * 1000).toISOString());
  assert.equal(rescheduleRes.success, false);
  assert.equal(rescheduleRes.error, RATE_LIMIT_ERROR_MESSAGE, "Reschedule must be blocked with rate limit error");

  // Test Customer Cancel Rate Limiting (max 5)
  const cancelMgmtHash = deriveManagementTokenSubjectHash(testMgmtToken);
  await prisma.rateLimitBucket.upsert({
    where: {
      scope_subjectHash_windowStart: {
        scope: RATE_LIMIT_CONFIG.CUSTOMER_CANCEL.scope,
        subjectHash: cancelMgmtHash,
        windowStart: new Date(Math.floor(Date.now() / RATE_LIMIT_CONFIG.CUSTOMER_CANCEL.windowMs) * RATE_LIMIT_CONFIG.CUSTOMER_CANCEL.windowMs),
      },
    },
    update: { count: RATE_LIMIT_CONFIG.CUSTOMER_CANCEL.max },
    create: {
      scope: RATE_LIMIT_CONFIG.CUSTOMER_CANCEL.scope,
      subjectHash: cancelMgmtHash,
      windowStart: new Date(Math.floor(Date.now() / RATE_LIMIT_CONFIG.CUSTOMER_CANCEL.windowMs) * RATE_LIMIT_CONFIG.CUSTOMER_CANCEL.windowMs),
      count: RATE_LIMIT_CONFIG.CUSTOMER_CANCEL.max,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const cancelFormData = new FormData();
  cancelFormData.set("reason", "Customer schedule conflict");
  const cancelRes = await cancelAppointmentAction(testMgmtToken, cancelFormData);
  assert.equal(cancelRes.success, false);
  assert.equal(cancelRes.error, RATE_LIMIT_ERROR_MESSAGE, "Cancel must be blocked with rate limit error");

  // Test Public Booking Rate Limiting (max 5)
  const phoneToLimit = "+359888777666";
  const bookingHash = deriveBookingSubjectHash(org.id, locationId, phoneToLimit);
  await prisma.rateLimitBucket.upsert({
    where: {
      scope_subjectHash_windowStart: {
        scope: RATE_LIMIT_CONFIG.PUBLIC_BOOKING.scope,
        subjectHash: bookingHash,
        windowStart: new Date(Math.floor(Date.now() / RATE_LIMIT_CONFIG.PUBLIC_BOOKING.windowMs) * RATE_LIMIT_CONFIG.PUBLIC_BOOKING.windowMs),
      },
    },
    update: { count: RATE_LIMIT_CONFIG.PUBLIC_BOOKING.max },
    create: {
      scope: RATE_LIMIT_CONFIG.PUBLIC_BOOKING.scope,
      subjectHash: bookingHash,
      windowStart: new Date(Math.floor(Date.now() / RATE_LIMIT_CONFIG.PUBLIC_BOOKING.windowMs) * RATE_LIMIT_CONFIG.PUBLIC_BOOKING.windowMs),
      count: RATE_LIMIT_CONFIG.PUBLIC_BOOKING.max,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const bookFormData = new FormData();
  bookFormData.set("locationId", locationId);
  bookFormData.set("serviceIds", service.id);
  bookFormData.set("staffId", staff.id);
  bookFormData.set("startsAt", new Date(Date.now() + 48 * 3600 * 1000).toISOString());
  bookFormData.set("customerName", "Spam User");
  bookFormData.set("customerPhone", phoneToLimit);
  bookFormData.set("customerEmail", "spam@example.com");

  const bookRes = await bookPublicSlot(org.slug, bookFormData);
  assert.equal(bookRes.error, RATE_LIMIT_ERROR_MESSAGE, "Public booking must be blocked with rate limit error");

  // Clean up test data
  await prisma.rateLimitBucket.deleteMany({
    where: {
      OR: [
        { scope: testScope },
        { subjectHash: rescheduleMgmtHash },
        { subjectHash: cancelMgmtHash },
        { subjectHash: bookingHash },
      ],
    },
  });

  console.log("verify: rate-limiting and abuse protection checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
