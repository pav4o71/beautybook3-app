import "dotenv/config";
import assert from "node:assert/strict";
import { AppointmentStatus } from "../../app/generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { getAppointmentsForDay } from "../../lib/appointments";
import { createAppointment } from "../../lib/booking";
import { getDemoTenantContext } from "../../lib/tenant";
import {
  addSalonDays,
  parseSalonIsoDate,
  salonDateAtTime,
  salonDayBounds,
  salonIsoDate,
} from "../../lib/timezone";
import { MemoryEmailSender } from "../../lib/email/memory-sender";
import { setTestEmailSender } from "../../lib/email/sender";
import { assertSafeVerifyTarget } from "./assert-safe-target";

async function main() {
  assertSafeVerifyTarget();
  console.log("verify: checking staff day board & walk-in reception...");

  const memorySender = new MemoryEmailSender();
  setTestEmailSender(memorySender);

  const { organizationId, locationId } = await getDemoTenantContext();

  const staff = await prisma.staff.findFirstOrThrow({
    where: { organizationId, locationId, active: true },
    include: { services: true },
  });

  const service = await prisma.service.findFirstOrThrow({
    where: {
      organizationId,
      active: true,
      id: { in: staff.services.map((s) => s.serviceId) },
    },
  });

  // 1. Day Board Boundary Verification
  const now = new Date();
  const dayOffset = (8 - now.getDay()) % 7 || 7;
  const targetDay = addSalonDays(now, dayOffset + 35); // 5 weeks ahead on a Monday
  const targetDateIso = salonIsoDate(targetDay);
  const parsedTargetDate = parseSalonIsoDate(targetDateIso);
  assert(parsedTargetDate, "Target date must parse correctly");

  const { start: dayStart, end: dayEnd } = salonDayBounds(parsedTargetDate);

  // Clean any preexisting appointments on this day
  await prisma.appointment.deleteMany({
    where: {
      organizationId,
      startsAt: { gte: dayStart, lt: dayEnd },
    },
  });

  // Pick Monday 10:00 AM, 12:00 PM, 14:00 PM (safely in working hours 09:00 - 18:00)
  const slot1 = salonDateAtTime(parsedTargetDate, 10, 0);
  const slot2 = salonDateAtTime(parsedTargetDate, 12, 0);
  const slot3 = salonDateAtTime(parsedTargetDate, 14, 0);

  // 2. Create Walk-In Appointment without phone or email (Name-only walk-in)
  const walkIn1 = await createAppointment({
    organizationId,
    locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt: slot1,
    customerName: "Walk-In Guest Maria",
    customerPhone: null,
    customerEmail: null,
    isWalkIn: true,
  });

  assert(walkIn1.id, "Walk-in appointment must be created");
  assert(walkIn1.rawToken, "Management token must be generated");
  assert.equal(memorySender.sentEmails.length, 0, "No email sent when customerEmail is omitted");

  // Verify created record in DB
  const dbWalkIn1 = await prisma.appointment.findUniqueOrThrow({
    where: { id: walkIn1.id },
    include: { customer: true },
  });
  assert.equal(dbWalkIn1.customerName, "Walk-In Guest Maria");
  assert.equal(dbWalkIn1.customerPhone, null);
  assert.equal(dbWalkIn1.customerEmail, null);
  assert.equal(dbWalkIn1.customerId, null);
  assert.equal(dbWalkIn1.status, AppointmentStatus.CONFIRMED);

  // 3. Create Walk-In Appointment with phone and email
  const walkIn2 = await createAppointment({
    organizationId,
    locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt: slot2,
    customerName: "Walk-In Juan Santos",
    customerPhone: "+639171234567",
    customerEmail: "juan.walkin@example.com",
    isWalkIn: true,
  });

  assert(walkIn2.id, "Walk-in Juan must be created");
  const dbWalkIn2 = await prisma.appointment.findUniqueOrThrow({
    where: { id: walkIn2.id },
  });
  assert.equal(dbWalkIn2.customerName, "Walk-In Juan Santos");
  assert.equal(dbWalkIn2.customerPhone, "+639171234567");
  assert.equal(dbWalkIn2.customerEmail, "juan.walkin@example.com");

  // 4. Day Board Query Verification for Target Date
  const dayBoard = await getAppointmentsForDay(organizationId, parsedTargetDate);
  assert(dayBoard.length >= 2, "Day board must list both created walk-in appointments");

  for (const appt of dayBoard) {
    assert(
      appt.startsAt >= dayStart && appt.startsAt < dayEnd,
      "All day board appointments must fall within salon day bounds",
    );
  }

  // Filter by staffId
  const staffAppointments = dayBoard.filter((a) => a.staffId === staff.id);
  assert(
    staffAppointments.some((a) => a.id === walkIn1.id),
    "WalkIn 1 must be present in specialist lane",
  );
  assert(
    staffAppointments.some((a) => a.id === walkIn2.id),
    "WalkIn 2 must be present in specialist lane",
  );

  // 5. Conflict & Overlap Protection (GiST exclusion constraint)
  // Attempt to book an overlapping appointment on the same staff member at slot1
  let collisionCaught = false;
  try {
    await createAppointment({
      organizationId,
      locationId,
      customerId: null,
      staffId: staff.id,
      serviceIds: [service.id],
      startsAt: slot1, // EXACT duplicate time
      customerName: "Colliding Walk-In",
      isWalkIn: true,
    });
  } catch (error) {
    collisionCaught = true;
    assert(
      error instanceof Error &&
        (error.message.includes("no longer available") ||
          error.message.includes("overlap") ||
          error.message.includes("exclusion constraint")),
      `Collision error expected, got: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  assert(collisionCaught, "Overlapping appointment must be rejected by conflict protection");

  // Non-overlapping slot3 succeeds
  const walkIn3 = await createAppointment({
    organizationId,
    locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt: slot3,
    customerName: "Walk-In Afternoon",
    isWalkIn: true,
  });
  assert(walkIn3.id, "Non-overlapping appointment at slot3 must succeed");

  // 6. Multi-Branch Location Isolation Check
  const secondLocation = await prisma.location.findFirst({
    where: { organizationId, id: { not: locationId } },
  });

  if (secondLocation) {
    // Create appointment at second location
    const otherStaff = await prisma.staff.findFirst({
      where: { organizationId, locationId: secondLocation.id, active: true },
    });

    if (otherStaff) {
      const walkInOtherLoc = await createAppointment({
        organizationId,
        locationId: secondLocation.id,
        customerId: null,
        staffId: otherStaff.id,
        serviceIds: [service.id],
        startsAt: slot3,
        customerName: "Other Branch Guest",
        isWalkIn: true,
      });

      // Query primary location's day board
      const primaryLocBoard = await getAppointmentsForDay(
        organizationId,
        parsedTargetDate,
        locationId,
      );
      assert(
        !primaryLocBoard.some((a) => a.id === walkInOtherLoc.id),
        "Appointments from another location must not appear in primary location day board",
      );

      // Query second location's day board
      const secondLocBoard = await getAppointmentsForDay(
        organizationId,
        parsedTargetDate,
        secondLocation.id,
      );
      assert(
        secondLocBoard.some((a) => a.id === walkInOtherLoc.id),
        "Appointments for second location must appear in second location day board",
      );

      await prisma.appointment.delete({ where: { id: walkInOtherLoc.id } });
    }
  }

  // Cleanup test appointments
  await prisma.appointment.deleteMany({
    where: {
      id: { in: [walkIn1.id, walkIn2.id, walkIn3.id] },
    },
  });

  console.log("verify: staff day board & walk-in reception checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
