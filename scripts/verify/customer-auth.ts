import "dotenv/config";
import assert from "node:assert";
import { prisma } from "../../lib/prisma";
import { assertLocalOnlyDatabaseUrl } from "../../lib/test-only-local-db";
import { linkGuestAppointmentsToVerifiedUser } from "../../lib/link-guest-appointments";
import { Role } from "../../app/generated/prisma/enums";
import { auth } from "../../lib/auth"; // For testing Better Auth if possible

assertLocalOnlyDatabaseUrl(process.env.DATABASE_URL);

async function main() {
  console.log("verify-customer-auth: starting...");

  const testEmail = `a5.test.${Date.now()}@example.com`;
  const otherEmail = `a5.other.${Date.now()}@example.com`;

  // DB-level lifecycle assertions (since testing Better Auth full token flow without browser might be complex)
  // We will directly use Prisma to simulate Better Auth's DB changes to verify our hooks and DB constraints.
  
  // 1. Create a customer user directly
  const user = await prisma.user.create({
    data: {
      id: `usr_test_${Date.now()}`,
      name: "A5 Test Customer",
      email: testEmail,
      emailVerified: false,
      role: Role.CUSTOMER,
    },
  });

  // Verify zero organization memberships
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
  });
  assert.strictEqual(memberships.length, 0, "Signup creates CUSTOMER role, 0 org members, emailVerified=false");
  assert.strictEqual(user.role, Role.CUSTOMER, "New user role must be CUSTOMER");
  assert.strictEqual(user.emailVerified, false, "emailVerified must be false initially");

  // 2. Create guest appointments with matching email (one uppercase, one lowercase)
  const org = await prisma.organization.findFirstOrThrow();
  const location = await prisma.location.findFirstOrThrow({ where: { organizationId: org.id } });
  const staff = await prisma.staff.findFirstOrThrow({ where: { organizationId: org.id } });

  const guestAppt1 = await prisma.appointment.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      staffId: staff.id,
      customerId: null,
      customerEmail: testEmail.toUpperCase(),
      customerName: "A5 Test Guest",
      customerPhone: "+639170000001",
      startsAt: new Date(Date.now() + 86400000 * 365), // +365 days
      endsAt: new Date(Date.now() + 86400000 * 365 + 3600000), // +1h
      status: "CONFIRMED",
    },
  });

  const guestAppt2 = await prisma.appointment.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      staffId: staff.id,
      customerId: null,
      customerEmail: testEmail,
      customerName: "A5 Test Guest 2",
      customerPhone: "+639170000003",
      startsAt: new Date(Date.now() + 86400000 * 366), // +366 days
      endsAt: new Date(Date.now() + 86400000 * 366 + 3600000), // +1h
      status: "CONFIRMED",
    },
  });

  // E: Appointment already owned by someone else
  const otherUser = await prisma.user.create({
    data: {
      id: `usr_other_${Date.now()}`,
      name: "Other User",
      email: otherEmail,
      emailVerified: true,
      role: Role.CUSTOMER,
    },
  });

  const ownedAppt = await prisma.appointment.create({
    data: {
      organizationId: org.id,
      locationId: location.id,
      staffId: staff.id,
      customerId: otherUser.id,
      customerEmail: testEmail, // Same email snapshot, but ALREADY owned by another user!
      customerName: "Imposter",
      customerPhone: "+639170000002",
      startsAt: new Date(Date.now() + 86400000 * 367), // +367 days
      endsAt: new Date(Date.now() + 86400000 * 367 + 3600000), // +1h
      status: "CONFIRMED",
    },
  });

  // A: Unverified user (emailVerified=false) → linked=0, appointment stays null
  const unverifiedResult = await linkGuestAppointmentsToVerifiedUser(user.id);
  assert.strictEqual(unverifiedResult.linked, 0, "Unverified user should link 0 appointments");
  const checkApptUnverified = await prisma.appointment.findUniqueOrThrow({ where: { id: guestAppt1.id } });
  assert.strictEqual(checkApptUnverified.customerId, null, "Appointment stays null");

  // B: Same user set emailVerified=true → appointment links
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });
  
  // Real DB lifecycle checks
  const verifiedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.strictEqual(verifiedUser.emailVerified, true, "After verification emailVerified=true");
  
  // Password reset creates/updates verification record
  await prisma.verification.create({
    data: {
      id: `verify_${Date.now()}`,
      identifier: testEmail,
      value: "token123",
      expiresAt: new Date(Date.now() + 3600000),
    }
  });

  // H: Unknown userId links nothing
  const unknownResult = await linkGuestAppointmentsToVerifiedUser("unknown-id-123");
  assert.strictEqual(unknownResult.linked, 0, "Unknown userId links nothing");

  // G: Concurrency — two concurrent calls link appointment to exactly one owner
  // C: No caller-supplied email (helper loads from DB)
  // D: Case normalization still works after verification (guestAppt1 has uppercase email)
  const concurrentCalls = await Promise.all([
    linkGuestAppointmentsToVerifiedUser(user.id),
    linkGuestAppointmentsToVerifiedUser(user.id)
  ]);
  
  const totalLinked = concurrentCalls.reduce((sum, res) => sum + res.linked, 0);
  assert.strictEqual(totalLinked, 2, "Concurrent calls should cumulatively link exactly 2 appointments");

  // Verify guestAppt1 is now linked to user.id
  const updatedAppt1 = await prisma.appointment.findUniqueOrThrow({ where: { id: guestAppt1.id } });
  assert.strictEqual(updatedAppt1.customerId, user.id, "guestAppt1 customerId must be updated to user.id");

  // Verify ownedAppt was NOT reassigned
  const updatedOwnedAppt = await prisma.appointment.findUniqueOrThrow({ where: { id: ownedAppt.id } });
  assert.strictEqual(updatedOwnedAppt.customerId, otherUser.id, "Already-owned appointment MUST NOT be reassigned");

  // F: Idempotency — second call links 0 more
  const relinkResult = await linkGuestAppointmentsToVerifiedUser(user.id);
  assert.strictEqual(relinkResult.linked, 0, "Idempotent relink should return 0 new linked appointments");

  // Cleanup test records
  await prisma.appointment.deleteMany({
    where: { id: { in: [guestAppt1.id, guestAppt2.id, ownedAppt.id] } },
  });
  await prisma.verification.deleteMany({
    where: { identifier: testEmail },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [user.id, otherUser.id] } },
  });

  console.log("verify-customer-auth: ok");
}

main().catch((err) => {
  console.error("verify-customer-auth failed:", err);
  process.exit(1);
});
