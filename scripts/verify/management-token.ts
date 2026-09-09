import "dotenv/config";
import {
  generateAppointmentManagementToken,
  getAppointmentByManagementToken,
  hashManagementToken,
  isValidManagementTokenFormat,
} from "../../lib/appointment-management-token";
import { createAppointment } from "../../lib/booking";
import { prisma } from "../../lib/prisma";
import { getDemoTenantContext } from "../../lib/tenant";
import { addSalonDays, salonDateAtTime } from "../../lib/timezone";
import { assertSafeVerifyTarget } from "./assert-safe-target";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  assertSafeVerifyTarget();

  // 1. Token Unit Properties
  const { rawToken, tokenHash } = generateAppointmentManagementToken();
  assert(typeof rawToken === "string", "rawToken must be string");
  assert(typeof tokenHash === "string", "tokenHash must be string");
  assert(rawToken.length === 43, "rawToken must be 43 chars (256-bit base64url)");
  assert(tokenHash.length === 64, "tokenHash must be 64 hex characters (SHA-256)");
  assert(rawToken !== tokenHash, "rawToken must not match hash");
  assert(isValidManagementTokenFormat(rawToken), "rawToken must be valid format");
  assert(hashManagementToken(rawToken) === tokenHash, "hash must be deterministic SHA-256");

  // Invalid token format rejections
  assert(!isValidManagementTokenFormat(""), "empty string is invalid");
  assert(!isValidManagementTokenFormat("short"), "short string is invalid");
  assert(!isValidManagementTokenFormat(null), "null is invalid");
  assert(!isValidManagementTokenFormat(undefined), "undefined is invalid");
  assert(!isValidManagementTokenFormat("a".repeat(42)), "42 chars is invalid");
  assert(!isValidManagementTokenFormat("a".repeat(44)), "44 chars is invalid");
  assert(
    !isValidManagementTokenFormat("!@#$%^&*()_+=-~`{}[]|:;<>?,./".padEnd(43, "x")),
    "invalid characters rejected",
  );

  // Entropy / distinctness test across 100 samples
  const tokens = new Set<string>();
  const hashes = new Set<string>();
  for (let i = 0; i < 100; i += 1) {
    const sample = generateAppointmentManagementToken();
    assert(isValidManagementTokenFormat(sample.rawToken), "sample token must be valid");
    tokens.add(sample.rawToken);
    hashes.add(sample.tokenHash);
  }
  assert(tokens.size === 100, "all 100 generated raw tokens must be distinct");
  assert(hashes.size === 100, "all 100 generated hashes must be distinct");

  // 2. Integration: Appointment Creation with Token
  const { organizationId, locationId } = await getDemoTenantContext();
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });
  const location = await prisma.location.findUniqueOrThrow({
    where: { id: locationId },
  });
  const service = await prisma.service.findFirstOrThrow({
    where: { organizationId, active: true },
  });
  const specialist = await prisma.staff.findFirstOrThrow({
    where: {
      organizationId,
      locationId,
      active: true,
      services: { some: { serviceId: service.id } },
    },
  });

  // Pick future Monday at 10:00 AM
  const now = new Date();
  const dayOffset = (8 - now.getDay()) % 7 || 7;
  const futureDay = addSalonDays(now, dayOffset + 14);
  const startsAt = salonDateAtTime(futureDay, 10, 0);

  // Clean any previous test run appointment at this slot
  await prisma.appointment.deleteMany({
    where: {
      organizationId,
      staffId: specialist.id,
      startsAt,
    },
  });

  const created = await createAppointment({
    organizationId: organization.id,
    locationId: location.id,
    customerId: null,
    staffId: specialist.id,
    serviceIds: [service.id],
    startsAt,
    customerName: "Token Verification Guest",
    customerPhone: "+639171234567",
    customerEmail: "token-guest@beautybook.local",
  });

  assert(typeof created.rawToken === "string", "createAppointment must return rawToken");
  assert(isValidManagementTokenFormat(created.rawToken), "created.rawToken must be valid format");

  // Verify DB state: hash is stored, raw token is NEVER stored
  const dbAppt = await prisma.appointment.findUnique({
    where: { id: created.id },
  });
  if (!dbAppt) {
    throw new Error("Appointment must exist in DB");
  }
  assert(
    dbAppt.managementTokenHash === hashManagementToken(created.rawToken),
    "DB must store deterministic SHA-256 hash",
  );
  assert(
    dbAppt.customerPhone === "+639171234567",
    "customerPhone snapshot preserved in DB record",
  );
  assert(
    dbAppt.customerEmail === "token-guest@beautybook.local",
    "customerEmail snapshot preserved in DB record",
  );

  // Verify the raw token itself is not stored in managementTokenHash,
  // while the column stores SHA-256(rawToken).
  const rawMatch = await prisma.$queryRaw<unknown[]>`
    SELECT id FROM "Appointment" WHERE "managementTokenHash" = ${created.rawToken};
  `;
  assert(
    rawMatch.length === 0,
    "Raw token must not be stored in managementTokenHash column",
  );

  // Verify lookup via getAppointmentByManagementToken
  const resolved = await getAppointmentByManagementToken(created.rawToken);
  assert(resolved !== null, "getAppointmentByManagementToken must resolve appointment");
  assert(resolved?.id === created.id, "resolved appointment ID must match");
  assert(
    resolved?.organization.name === organization.name,
    "resolved organization name must match",
  );
  assert(
    resolved?.location.name === location.name,
    "resolved location name must match",
  );
  assert(
    resolved?.staff.name === specialist.name,
    "resolved specialist name must match",
  );
  assert(
    resolved?.customerName === "Token Verification Guest",
    "customerName snapshot preserved in resolved view",
  );

  // Defense-in-depth: Ensure least-privilege projection does not expose sensitive fields
  const resolvedRecord = resolved as unknown as Record<string, unknown>;
  assert(resolvedRecord.customerPhone === undefined, "resolved appointment must not expose customerPhone");
  assert(resolvedRecord.customerEmail === undefined, "resolved appointment must not expose customerEmail");
  assert(resolvedRecord.customerId === undefined, "resolved appointment must not expose customerId");
  assert(resolvedRecord.managementTokenHash === undefined, "resolved appointment must not expose managementTokenHash");
  assert(resolvedRecord.notes === undefined, "resolved appointment must not expose notes");
  assert(resolvedRecord.organizationId === undefined, "resolved appointment must not expose organizationId");
  assert(resolvedRecord.locationId === undefined, "resolved appointment must not expose locationId");
  assert(resolvedRecord.staffId === undefined, "resolved appointment must not expose staffId");

  const orgRecord = resolved?.organization as unknown as Record<string, unknown>;
  assert(orgRecord.phone === undefined, "resolved organization must not expose phone");
  assert(orgRecord.id === undefined, "resolved organization must not expose id");

  const locRecord = resolved?.location as unknown as Record<string, unknown>;
  assert(locRecord.phone === undefined, "resolved location must not expose phone");
  assert(locRecord.id === undefined, "resolved location must not expose id");

  const staffRecord = resolved?.staff as unknown as Record<string, unknown>;
  assert(staffRecord.bio === undefined, "resolved staff must not expose bio");
  assert(staffRecord.id === undefined, "resolved staff must not expose id");

  const serviceRecord = resolved?.services[0]?.service as unknown as Record<string, unknown>;
  assert(serviceRecord.description === undefined, "resolved service must not expose description");
  assert(serviceRecord.id === undefined, "resolved service must not expose id");

  // Negative lookups
  const nonExistentRaw = generateAppointmentManagementToken().rawToken;
  const missing = await getAppointmentByManagementToken(nonExistentRaw);
  assert(missing === null, "non-existent token must resolve to null");

  const malformed = await getAppointmentByManagementToken("invalid-short-token");
  assert(malformed === null, "malformed token must resolve to null without DB query");

  // 3. Historical Appointments (null managementTokenHash)
  const nullTokenAppts = await prisma.appointment.findMany({
    where: { managementTokenHash: null },
  });
  // Historical appointments exist and remain valid
  assert(nullTokenAppts.length > 0, "Historical NULL-token appointments must remain valid");

  // 4. GiST & Concurrency regression check: ensure GiST constraint is active
  const gist = await prisma.$queryRaw<unknown[]>`
    SELECT conname::text, contype::text 
    FROM pg_constraint 
    WHERE conrelid = '"Appointment"'::regclass AND conname = 'Appointment_staff_no_overlap';
  `;
  assert(gist.length === 1, "GiST exclusion constraint Appointment_staff_no_overlap must be active");

  console.log("verify-management-token: ok", {
    tokenLength: created.rawToken.length,
    hashLength: dbAppt.managementTokenHash?.length,
    nullTokenHistoricalCount: nullTokenAppts.length,
  });
}

main()
  .catch((err) => {
    console.error("verify-management-token failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
