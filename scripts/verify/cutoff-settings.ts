import "dotenv/config";
import { assertLocalOnlyDatabaseUrl } from "../../lib/test-only-local-db";
import { prisma } from "../../lib/prisma";
import { AppointmentStatus } from "../../app/generated/prisma/enums";
import {
  canCustomerCancelAppointment,
  canCustomerRescheduleAppointment,
  cancelAppointmentByManagementToken,
  rescheduleAppointmentByManagementToken,
  generateAppointmentManagementToken,
} from "../../lib/appointment-management-token";
import {
  DEFAULT_CUTOFF_HOURS,
  MIN_CUTOFF_HOURS,
  MAX_CUTOFF_HOURS,
  validateCutoffHours,
} from "../../lib/cancellation-constants";
import { getDemoTenantContext } from "../../lib/tenant";
import { addSalonDays, salonDateAtTime } from "../../lib/timezone";

assertLocalOnlyDatabaseUrl(process.env.DATABASE_URL);

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const { organizationId, locationId } = await getDemoTenantContext();
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });
  const specialist = await prisma.staff.findFirstOrThrow({
    where: { organizationId, locationId, active: true },
  });

  // 1. Verify default cutoff hours
  assert(
    organization.cancellationCutoffHours === DEFAULT_CUTOFF_HOURS,
    `Default cutoff hours must be ${DEFAULT_CUTOFF_HOURS}, got ${organization.cancellationCutoffHours}`,
  );
  assert(MIN_CUTOFF_HOURS === 0, "MIN_CUTOFF_HOURS must be 0");
  assert(MAX_CUTOFF_HOURS === 168, "MAX_CUTOFF_HOURS must be 168");

  // 2. Verify bounds validator helper
  const valid0 = validateCutoffHours(0);
  assert(valid0.ok && valid0.hours === 0, "0 hours cutoff must be valid");
  const valid0Str = validateCutoffHours("0");
  assert(valid0Str.ok && valid0Str.hours === 0, "'0' string cutoff must be valid");
  const valid1 = validateCutoffHours(1);
  assert(valid1.ok && valid1.hours === 1, "1 hour cutoff must be valid");
  const valid48 = validateCutoffHours("48");
  assert(valid48.ok && valid48.hours === 48, "48 hours cutoff string must be valid and coerced to number");
  const valid168 = validateCutoffHours(168);
  assert(valid168.ok && valid168.hours === 168, "168 hours cutoff must be valid");

  const invalidNegative1 = validateCutoffHours(-1);
  assert(!invalidNegative1.ok, "-1 hours cutoff must be invalid");
  const invalidNegative5 = validateCutoffHours(-5);
  assert(!invalidNegative5.ok, "Negative hours cutoff must be invalid");
  const invalidTooHigh = validateCutoffHours(169);
  assert(!invalidTooHigh.ok, "> 168 hours cutoff must be invalid");
  const invalidDecimal = validateCutoffHours(12.5);
  assert(!invalidDecimal.ok, "Decimal hours cutoff must be invalid");
  const invalidNaN = validateCutoffHours("not-a-number");
  assert(!invalidNaN.ok, "NaN cutoff must be invalid");

  let testApptId: string | null = null;

  try {
    // 3. Update organization cutoff to 48 hours
    await prisma.organization.update({
      where: { id: organizationId },
      data: { cancellationCutoffHours: 48 },
    });

    const updatedOrg = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    assert(updatedOrg.cancellationCutoffHours === 48, "Organization cutoff should update to 48");

    // 4. Create an appointment 36 hours in the future
    // Under 24h cutoff, 36h is eligible. Under 48h cutoff, 36h is BLOCKED.
    const now = new Date();
    const future36h = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    const futureEnd = new Date(future36h.getTime() + 30 * 60 * 1000);

    await prisma.appointment.deleteMany({
      where: {
        organizationId,
        staffId: specialist.id,
        startsAt: { lt: futureEnd },
        endsAt: { gt: future36h },
      },
    });

    const token = generateAppointmentManagementToken();
    const appt = await prisma.appointment.create({
      data: {
        organizationId,
        locationId,
        staffId: specialist.id,
        startsAt: future36h,
        endsAt: futureEnd,
        status: AppointmentStatus.CONFIRMED,
        customerName: "Cutoff Test Guest",
        managementTokenHash: token.tokenHash,
      },
      include: {
        organization: {
          select: { cancellationCutoffHours: true },
        },
      },
    });
    testApptId = appt.id;

    // 5. Test dynamic cancellation check against 48h cutoff
    const cancelCheck = canCustomerCancelAppointment(appt, now);
    assert(!cancelCheck.allowed, "Appointment 36h ahead must be blocked by 48h cutoff");
    assert(cancelCheck.cutoffHours === 48, "Cutoff hours reported must be 48");
    assert(
      cancelCheck.reason?.includes("48 hours") ?? false,
      "Reason must specify 48 hours",
    );

    let cancelBlockedByServer = false;
    try {
      await cancelAppointmentByManagementToken({
        rawToken: token.rawToken,
        reason: "schedule_conflict",
      });
    } catch (err) {
      cancelBlockedByServer = err instanceof Error && err.message.includes("48 hours");
    }
    assert(cancelBlockedByServer, "cancelAppointmentByManagementToken must reject using 48h cutoff");

    // 6. Test dynamic reschedule check against 48h cutoff
    const rescheduleCheck = canCustomerRescheduleAppointment(appt, now);
    assert(!rescheduleCheck.allowed, "Appointment 36h ahead must be blocked by 48h cutoff for reschedule");
    assert(rescheduleCheck.cutoffHours === 48, "Cutoff hours reported must be 48");
    assert(
      rescheduleCheck.reason?.includes("48 hours") ?? false,
      "Reason must specify 48 hours",
    );

    let rescheduleBlockedByServer = false;
    const futureGridSlot = salonDateAtTime(addSalonDays(now, 5), 11, 0);
    try {
      await rescheduleAppointmentByManagementToken({
        rawToken: token.rawToken,
        targetStartsAt: futureGridSlot,
      });
    } catch (err) {
      rescheduleBlockedByServer = err instanceof Error && err.message.includes("48 hours");
    }
    assert(rescheduleBlockedByServer, "rescheduleAppointmentByManagementToken must reject using 48h cutoff");

    // 7. Lower cutoff to 12 hours and verify that 36h ahead becomes allowed
    await prisma.organization.update({
      where: { id: organizationId },
      data: { cancellationCutoffHours: 12 },
    });
    const apptWith12h = await prisma.appointment.findUniqueOrThrow({
      where: { id: appt.id },
      include: {
        organization: { select: { cancellationCutoffHours: true } },
      },
    });
    const cancelAllowed12h = canCustomerCancelAppointment(apptWith12h, now);
    assert(cancelAllowed12h.allowed, "Appointment 36h ahead must be allowed when cutoff is 12h");
    const rescheduleAllowed12h = canCustomerRescheduleAppointment(apptWith12h, now);
    assert(rescheduleAllowed12h.allowed, "Appointment 36h ahead must be allowed for reschedule when cutoff is 12h");

    // 8. Lower cutoff to 0 hours and verify zero-hour semantics
    await prisma.organization.update({
      where: { id: organizationId },
      data: { cancellationCutoffHours: 0 },
    });
    const updatedZeroOrg = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    assert(updatedZeroOrg.cancellationCutoffHours === 0, "Organization cutoff should update to 0");

    const apptWith0h = await prisma.appointment.findUniqueOrThrow({
      where: { id: appt.id },
      include: {
        organization: { select: { cancellationCutoffHours: true } },
      },
    });

    // Future appointment with cutoff 0: allowed for cancel and reschedule
    const cancelAllowed0h = canCustomerCancelAppointment(apptWith0h, now);
    assert(cancelAllowed0h.allowed, "Future appointment with cutoff 0 must be cancellable");
    assert(cancelAllowed0h.cutoffHours === 0, "Reported cutoff hours must be 0");

    const rescheduleAllowed0h = canCustomerRescheduleAppointment(apptWith0h, now);
    assert(rescheduleAllowed0h.allowed, "Future appointment with cutoff 0 must be reschedulable");
    assert(rescheduleAllowed0h.cutoffHours === 0, "Reported cutoff hours must be 0");

    // Near future appointment (e.g. 15 minutes ahead) with cutoff 0: STILL ALLOWED
    const near15m = new Date(now.getTime() + 15 * 60 * 1000);
    const nearAppt = {
      startsAt: near15m,
      status: AppointmentStatus.CONFIRMED,
      organization: { cancellationCutoffHours: 0 },
    };
    const cancelAllowedNear = canCustomerCancelAppointment(nearAppt, now);
    assert(cancelAllowedNear.allowed, "Appointment 15m ahead with cutoff 0 must be allowed");
    const rescheduleAllowedNear = canCustomerRescheduleAppointment(nearAppt, now);
    assert(rescheduleAllowedNear.allowed, "Appointment 15m ahead with cutoff 0 must be allowed for reschedule");

    // Appointment exactly at start time with cutoff 0: FORBIDDEN
    const atStartAppt = {
      startsAt: now,
      status: AppointmentStatus.CONFIRMED,
      organization: { cancellationCutoffHours: 0 },
    };
    const cancelAtStart = canCustomerCancelAppointment(atStartAppt, now);
    assert(!cancelAtStart.allowed, "Appointment at start time with cutoff 0 must be forbidden");
    const rescheduleAtStart = canCustomerRescheduleAppointment(atStartAppt, now);
    assert(!rescheduleAtStart.allowed, "Appointment at start time with cutoff 0 must be forbidden for reschedule");

    // Appointment in the past with cutoff 0: FORBIDDEN
    const pastAppt = {
      startsAt: new Date(now.getTime() - 10 * 60 * 1000),
      status: AppointmentStatus.CONFIRMED,
      organization: { cancellationCutoffHours: 0 },
    };
    const cancelPast = canCustomerCancelAppointment(pastAppt, now);
    assert(!cancelPast.allowed, "Appointment in past with cutoff 0 must be forbidden");
    const reschedulePast = canCustomerRescheduleAppointment(pastAppt, now);
    assert(!reschedulePast.allowed, "Appointment in past with cutoff 0 must be forbidden for reschedule");

    console.log("verify:cutoff-settings passed");
  } finally {
    // 9. Restore organization cutoff back to default 24
    await prisma.organization.update({
      where: { id: organizationId },
      data: { cancellationCutoffHours: DEFAULT_CUTOFF_HOURS },
    });

    if (testApptId) {
      await prisma.appointment.delete({
        where: { id: testApptId },
      });
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
