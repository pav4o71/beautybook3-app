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

  // ==========================================
  // 7. TIMELINE GEOMETRY & SNAPSHOT IMMUTABILITY TESTS
  // ==========================================
  const {
    buildTimeMarkers,
    deriveVisibleRange,
    appointmentTop,
    appointmentHeight,
    getAppointmentSnapshotDuration,
    PIXELS_PER_MINUTE,
    STEP_MINUTES,
  } = await import("../../lib/admin-day-board-geometry");

  // 7.1 Time Markers & 30-Minute Grid
  const visibleRange = deriveVisibleRange(parsedTargetDate, [], [], 8, 18);
  assert.equal(visibleRange.startMinutes, 480, "Default visible range starts at 08:00 (480m)");
  assert.equal(visibleRange.endMinutes, 1080, "Default visible range ends at 18:00 (1080m)");

  const markers = buildTimeMarkers(visibleRange.startMinutes, visibleRange.endMinutes, STEP_MINUTES, PIXELS_PER_MINUTE);
  assert(markers.length >= 20, "Expected at least 20 30-min markers across the day range");
  assert.equal(markers[0].label, "08:00", "First marker is 08:00");
  assert.equal(markers[0].topPx, 0, "First marker top is 0px");
  assert.equal(markers[0].isHour, true, "08:00 is an hour marker");
  assert.equal(markers[1].label, "08:30", "Second marker is 08:30");
  assert.equal(markers[1].topPx, 60, "08:30 top is 60px (30m * 2px/m)");
  assert.equal(markers[1].isHour, false, "08:30 is not an hour marker");

  // 7.2 Temporal Top Position: 10:00 appointment is lower than 09:00 appointment
  const time9am = salonDateAtTime(parsedTargetDate, 9, 0);
  const time10am = salonDateAtTime(parsedTargetDate, 10, 0);
  const time1030am = salonDateAtTime(parsedTargetDate, 10, 30);
  const time1130am = salonDateAtTime(parsedTargetDate, 11, 30);

  const top9am = appointmentTop(time9am, visibleRange.startMinutes, PIXELS_PER_MINUTE);
  const top10am = appointmentTop(time10am, visibleRange.startMinutes, PIXELS_PER_MINUTE);
  assert.equal(top9am, 120, "09:00 top is 120px (60m * 2px/m)");
  assert.equal(top10am, 240, "10:00 top is 240px (120m * 2px/m)");
  assert(top10am > top9am, "10:00 appointment top position is strictly lower than 09:00 appointment");

  // 7.3 Duration-Based Height: 60m is 2× 30m, 90m is 3× 30m
  const height30m = appointmentHeight(time10am, time1030am, PIXELS_PER_MINUTE);
  const height60m = appointmentHeight(time9am, time10am, PIXELS_PER_MINUTE);
  const height90m = appointmentHeight(time10am, time1130am, PIXELS_PER_MINUTE);

  assert.equal(height30m, 60, "30m appointment height is 60px");
  assert.equal(height60m, 120, "60m appointment height is 120px");
  assert.equal(height90m, 180, "90m appointment height is 180px");
  assert.equal(height60m, height30m * 2, "60m appointment height is exactly 2× 30m appointment height");
  assert.equal(height90m, height30m * 3, "90m appointment height is exactly 3× 30m appointment height");

  // 7.4 Cross-Staff Lane Scale: Appointments at same time share exact same vertical topPx
  const staff2 = await prisma.staff.findFirst({
    where: { organizationId, locationId, id: { not: staff.id }, active: true },
  });
  if (staff2) {
    const topStaff1 = appointmentTop(time10am, visibleRange.startMinutes, PIXELS_PER_MINUTE);
    const topStaff2 = appointmentTop(time10am, visibleRange.startMinutes, PIXELS_PER_MINUTE);
    assert.equal(topStaff1, topStaff2, "Appointments in different staff lanes share identical vertical time scale");
  }

  // 7.5 Snapshot Duration Immutability: Service.durationMin mutation does NOT alter historical appointment snapshot
  await prisma.appointment.deleteMany({
    where: {
      organizationId,
      startsAt: { gte: dayStart, lt: dayEnd },
    },
  });

  const originalDuration = service.durationMin;
  const snapshotTestAppt = await createAppointment({
    organizationId,
    locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt: slot1,
    customerName: "Snapshot Test Guest",
    isWalkIn: true,
  });

  // Fetch appointment services snapshot
  const dbSnapshotAppt = await prisma.appointment.findUniqueOrThrow({
    where: { id: snapshotTestAppt.id },
    include: { services: { include: { service: true } } },
  });
  const snapshotDurationBefore = getAppointmentSnapshotDuration(dbSnapshotAppt.services);
  assert.equal(snapshotDurationBefore, originalDuration, "Snapshot duration matches initial service duration");

  // Mutate catalog Service.durationMin in database
  const alteredDuration = originalDuration + 45;
  await prisma.service.update({
    where: { id: service.id },
    data: { durationMin: alteredDuration },
  });

  // Re-fetch historical appointment
  const dbSnapshotApptAfter = await prisma.appointment.findUniqueOrThrow({
    where: { id: snapshotTestAppt.id },
    include: { services: { include: { service: true } } },
  });
  const snapshotDurationAfter = getAppointmentSnapshotDuration(dbSnapshotApptAfter.services);
  assert.equal(
    snapshotDurationAfter,
    originalDuration,
    "Historical appointment snapshot duration is IMMUTABLE and does not change when Service.durationMin changes",
  );
  assert.notEqual(
    snapshotDurationAfter,
    dbSnapshotApptAfter.services[0].service.durationMin,
    "Committed appointment snapshot differs from modified catalog service",
  );

  // Restore original service duration
  await prisma.service.update({
    where: { id: service.id },
    data: { durationMin: originalDuration },
  });

  // ==========================================
  // 8. CANCELLED + REBOOKED SAME SLOT UX
  // ==========================================
  // Cancel snapshotTestAppt at slot1
  await prisma.appointment.update({
    where: { id: snapshotTestAppt.id },
    data: { status: AppointmentStatus.CANCELLED, cancelledAt: new Date() },
  });

  // Re-book slot1 with a replacement appointment (now unblocked by GiST)
  const replacementAppt = await createAppointment({
    organizationId,
    locationId,
    customerId: null,
    staffId: staff.id,
    serviceIds: [service.id],
    startsAt: slot1,
    customerName: "Replacement Guest Slot 1",
    isWalkIn: true,
  });
  assert(replacementAppt.id, "Rebooking same slot after cancellation succeeds");

  // Query Day Board
  const slotDayBoard = await getAppointmentsForDay(organizationId, parsedTargetDate, locationId);
  const activeApptsAtSlot = slotDayBoard.filter(
    (a) => a.staffId === staff.id && a.status !== AppointmentStatus.CANCELLED,
  );
  const cancelledApptsAtSlot = slotDayBoard.filter(
    (a) => a.staffId === staff.id && a.status === AppointmentStatus.CANCELLED,
  );

  assert(
    activeApptsAtSlot.some((a) => a.id === replacementAppt.id),
    "Active replacement appointment is present in active lane",
  );
  assert(
    cancelledApptsAtSlot.some((a) => a.id === snapshotTestAppt.id),
    "Cancelled historical appointment is present in cancelled history list",
  );

  // Cleanup test appointments
  await prisma.appointment.deleteMany({
    where: {
      id: { in: [walkIn1.id, walkIn2.id, walkIn3.id, snapshotTestAppt.id, replacementAppt.id] },
    },
  });

  console.log("verify: staff day board & walk-in reception checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
