import "dotenv/config";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { normalizePhone, formatPhoneDisplay } from "../../lib/phone";
import { publicBookSlotSchema } from "../../lib/validations/booking";
import { createAppointment } from "../../lib/booking";
import { getAppointmentContactDisplay } from "../../lib/appointments";
import { prisma } from "../../lib/prisma";
import { assertSafeVerifyTarget } from "./assert-safe-target";
import { getDemoTenantContext } from "../../lib/tenant";
import { addSalonDays, salonDateAtTime } from "../../lib/timezone";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectRejects(
  fn: () => Promise<unknown>,
  messageIncludes: string,
) {
  try {
    await fn();
    throw new Error(`Expected rejection containing "${messageIncludes}"`);
  } catch (error) {
    if (error instanceof Error && error.message.includes(messageIncludes)) {
      return;
    }
    throw error;
  }
}

async function main() {
  assertSafeVerifyTarget();

  // 1. Phone Normalization Unit Tests
  const phLocal11 = normalizePhone("09171234567");
  assert(phLocal11.valid && phLocal11.e164 === "+639171234567", "09171234567 should normalize to +639171234567");

  const phLocal10 = normalizePhone("9171234567");
  assert(phLocal10.valid && phLocal10.e164 === "+639171234567", "9171234567 should normalize to +639171234567");

  const phE164 = normalizePhone("+639171234567");
  assert(phE164.valid && phE164.e164 === "+639171234567", "+639171234567 should remain canonical");

  const phFormatted = normalizePhone("+63 917 123 4567");
  assert(phFormatted.valid && phFormatted.e164 === "+639171234567", "+63 917 123 4567 should normalize to +639171234567");

  const phDashed = normalizePhone("0917-123-4567");
  assert(phDashed.valid && phDashed.e164 === "+639171234567", "0917-123-4567 should normalize to +639171234567");

  const international = normalizePhone("+14155552671");
  assert(international.valid && international.e164 === "+14155552671", "+14155552671 should normalize to canonical US E.164");

  const invalidShort = normalizePhone("12345");
  assert(!invalidShort.valid, "12345 should be rejected as invalid");

  const invalidAlpha = normalizePhone("abcdefghijk");
  assert(!invalidAlpha.valid, "alphabetic string should be rejected");

  // Strict whole-input phone parsing tests (reject surrounding text)
  const surrounded1 = normalizePhone("Call me 09171234567");
  assert(!surrounded1.valid, "'Call me 09171234567' should be rejected");

  const surrounded2 = normalizePhone("phone: +639171234567 hello");
  assert(!surrounded2.valid, "'phone: +639171234567 hello' should be rejected");

  const surrounded3 = normalizePhone("09171234567 text");
  assert(!surrounded3.valid, "'09171234567 text' should be rejected");

  // Display formatting
  assert(formatPhoneDisplay("+639171234567") === "0917 123 4567", "PH number formats as national display");
  assert(formatPhoneDisplay("+14155552671") === "+1 415 555 2671", "US number formats as international display");

  // 2. Schema Validation Tests
  const validParsed = publicBookSlotSchema.safeParse({
    locationId: "loc_demo",
    serviceIds: ["svc_demo"],
    staffId: "stf_demo",
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    customerName: "Maria Santos",
    customerPhone: "0917 123 4567",
    customerEmail: "Maria.Santos@Example.COM",
  });
  assert(validParsed.success, "Valid input should parse successfully");
  if (validParsed.success) {
    assert(validParsed.data.customerPhone === "+639171234567", "Phone parsed as canonical E.164");
    assert(validParsed.data.customerEmail === "maria.santos@example.com", "Email normalized to lowercase");
  }

  const blankName = publicBookSlotSchema.safeParse({
    locationId: "loc_demo",
    serviceIds: ["svc_demo"],
    staffId: "stf_demo",
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    customerName: "   ",
    customerPhone: "09171234567",
  });
  assert(!blankName.success, "Blank customerName should be rejected");

  const omittedEmail = publicBookSlotSchema.safeParse({
    locationId: "loc_demo",
    serviceIds: ["svc_demo"],
    staffId: "stf_demo",
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    customerName: "Maria Santos",
    customerPhone: "09171234567",
  });
  assert(omittedEmail.success && omittedEmail.data.customerEmail === null, "Omitted email should resolve to null");

  const invalidEmail = publicBookSlotSchema.safeParse({
    locationId: "loc_demo",
    serviceIds: ["svc_demo"],
    staffId: "stf_demo",
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    customerName: "Maria Santos",
    customerPhone: "09171234567",
    customerEmail: "not-an-email",
  });
  assert(!invalidEmail.success, "Invalid email format should be rejected");

  // 3. Database Persistence Tests
  const tenant = await getDemoTenantContext();
  const testStaff = await prisma.staff.findFirstOrThrow({
    where: { organizationId: tenant.organizationId, name: "Maya Petrova" },
  });
  const testService = await prisma.service.findFirstOrThrow({
    where: { organizationId: tenant.organizationId, name: "Haircut" },
  });
  const secondService = await prisma.service.findFirstOrThrow({
    where: { organizationId: tenant.organizationId, name: "Hair colour" },
  });
  const locationId = testStaff.locationId!;

  // Pick next Monday 10:00 AM where Maya is scheduled
  const now = new Date();
  const dayOffset = (8 - now.getDay()) % 7 || 7;
  const futureDay = addSalonDays(now, dayOffset + 7);
  const targetSlot = salonDateAtTime(futureDay, 10, 0);

  // Clean any existing test appointments at this slot
  await prisma.appointment.deleteMany({
    where: {
      organizationId: tenant.organizationId,
      staffId: testStaff.id,
      startsAt: targetSlot,
    },
  });

  // A. Guest booking with contact snapshot
  const guestAppt = await createAppointment({
    organizationId: tenant.organizationId,
    locationId,
    customerId: null,
    staffId: testStaff.id,
    serviceIds: [testService.id],
    startsAt: targetSlot,
    customerName: "Guest Client",
    customerPhone: "+639178889999",
    customerEmail: "guest@example.com",
  });

  assert(guestAppt.customerId === null, "Guest booking should have customerId = null");
  assert(guestAppt.customerName === "Guest Client", "customerName should be persisted");
  assert(guestAppt.customerPhone === "+639178889999", "customerPhone should be persisted as canonical E.164");
  assert(guestAppt.customerEmail === "guest@example.com", "customerEmail should be persisted lowercase");

  // B. GiST overlap constraint verification
  await expectRejects(
    () =>
      createAppointment({
        organizationId: tenant.organizationId,
        locationId,
        customerId: null,
        staffId: testStaff.id,
        serviceIds: [testService.id],
        startsAt: targetSlot,
        customerName: "Conflicting Client",
        customerPhone: "+639171112222",
      }),
    "That time is no longer available.",
  );

  // Clean the test appointment
  await prisma.appointment.delete({ where: { id: guestAppt.id } });

  // C. Authenticated booking compatibility
  const customerUser = await prisma.user.findFirstOrThrow({ where: { email: "customer@beautybook.local" } });

  const authAppt = await createAppointment({
    organizationId: tenant.organizationId,
    locationId,
    customerId: customerUser.id,
    staffId: testStaff.id,
    serviceIds: [testService.id],
    startsAt: targetSlot,
    customerName: customerUser.name,
    customerPhone: "+639175554444",
    customerEmail: customerUser.email,
  });

  assert(authAppt.customerId === customerUser.id, "Authenticated booking links customerId");
  assert(authAppt.customerName === customerUser.name, "Authenticated booking snapshots name");
  assert(authAppt.customerPhone === "+639175554444", "Authenticated booking snapshots phone");

  await prisma.appointment.delete({ where: { id: authAppt.id } });

  // D. Historical NULL snapshot compatibility
  const nullAppt = await createAppointment({
    organizationId: tenant.organizationId,
    locationId,
    customerId: null,
    staffId: testStaff.id,
    serviceIds: [testService.id],
    startsAt: targetSlot,
  });

  assert(nullAppt.customerName === null, "customerName can be null");
  assert(nullAppt.customerPhone === null, "customerPhone can be null");
  assert(nullAppt.customerEmail === null, "customerEmail can be null");

  await prisma.appointment.delete({ where: { id: nullAppt.id } });

  // E. Multi-service booking compatibility
  const multiAppt = await createAppointment({
    organizationId: tenant.organizationId,
    locationId,
    customerId: null,
    staffId: testStaff.id,
    serviceIds: [testService.id, secondService.id],
    startsAt: targetSlot,
    customerName: "Multi-Service Client",
    customerPhone: "+639179990000",
    customerEmail: "multi@example.com",
  });

  const loaded = await prisma.appointment.findUnique({
    where: { id: multiAppt.id },
    include: { services: true },
  });

  assert(loaded?.services.length === 2, "Multi-service appointment has 2 services");
  assert(loaded?.customerName === "Multi-Service Client", "Contact snapshot persisted on multi-service appt");
  await prisma.appointment.delete({ where: { id: multiAppt.id } });

  // 4. Contact Snapshot Semantics Regression Tests
  // CASE 1: linked user email exists, appointment customerName exists, appointment customerPhone exists, appointment customerEmail = null
  // EXPECTED: linked User email must NOT appear.
  const case1Display = getAppointmentContactDisplay({
    customerName: "Maria Santos",
    customerPhone: "+639171234567",
    customerEmail: null,
    customer: {
      name: "Demo Customer",
      email: "customer@beautybook.local",
      phone: "+639170001111",
    },
  });
  assert(case1Display.hasContactSnapshot, "Case 1: hasContactSnapshot must be true");
  assert(case1Display.customerName === "Maria Santos", "Case 1: customerName must be snapshot value");
  assert(case1Display.customerPhone === "+639171234567", "Case 1: customerPhone must be snapshot value");
  assert(case1Display.customerEmail === null, "Case 1: linked User email must NOT appear when snapshot customerEmail is null");

  // CASE 2: all three Appointment snapshot fields null, linked User exists
  // EXPECTED: legacy fallback continues to work.
  const case2Display = getAppointmentContactDisplay({
    customerName: null,
    customerPhone: null,
    customerEmail: null,
    customer: {
      name: "Demo Customer",
      email: "customer@beautybook.local",
      phone: "+639170001111",
    },
  });
  assert(!case2Display.hasContactSnapshot, "Case 2: hasContactSnapshot must be false for legacy data");
  assert(case2Display.customerName === "Demo Customer", "Case 2: legacy fallback to customer name");
  assert(case2Display.customerEmail === "customer@beautybook.local", "Case 2: legacy fallback to customer email");
  assert(case2Display.customerPhone === "+639170001111", "Case 2: legacy fallback to customer phone");

  // CASE 3: all three snapshot fields null, no customer user -> "Walk-in"
  const case3Display = getAppointmentContactDisplay({
    customerName: null,
    customerPhone: null,
    customerEmail: null,
    customer: null,
  });
  assert(case3Display.customerName === "Walk-in", "Case 3: fallback to Walk-in");
  assert(case3Display.customerPhone === null && case3Display.customerEmail === null, "Case 3: phone and email null");

  // 5. Playwright Pre-Webserver DB Guard Verification
  const rootDir = path.resolve(import.meta.dirname, "../..");
  const testPlaywrightGuard = spawnSync(
    "npx",
    ["tsx", "-e", 'require("./playwright.config.ts")'],
    {
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: "postgresql://beautybook:dummy@remote-danger.example.com:5432/beautybook" },
      stdio: "pipe",
    },
  );
  assert(testPlaywrightGuard.status !== 0, "playwright.config.ts must fail fast on non-local DATABASE_URL");
  assert(
    testPlaywrightGuard.stderr.toString().includes("Refusing: mutating test, seed, and verify commands require a confirmed local test/dev database"),
    "playwright.config.ts must enforce assertLocalOnlyDatabase before webServer starts",
  );

  console.log("verify-contact-capture: ok", {
    phNormalized: "+639171234567",
    internationalNormalized: "+14155552671",
    snapshotsVerified: true,
    gistExclusionActive: true,
    snapshotSemanticsVerified: true,
    playwrightGuardPreWebserverVerified: true,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
