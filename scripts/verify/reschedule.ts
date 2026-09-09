import "dotenv/config";
import { assertLocalOnlyDatabaseUrl } from "../../lib/test-only-local-db";
import { prisma } from "../../lib/prisma";
import { AppointmentStatus } from "../../app/generated/prisma/enums";
import {
  canCustomerRescheduleAppointment,
  generateAppointmentManagementToken,
  getAppointmentByManagementToken,
  rescheduleAppointmentByManagementToken,
  isValidManagementTokenFormat,
} from "../../lib/appointment-management-token";
import { createAppointment } from "../../lib/booking";
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

  // Pick future Monday at 11:00 AM (safely outside 24h cutoff, working hours)
  const now = new Date();
  const dayOffset = (8 - now.getDay()) % 7 || 7;
  const futureDay1 = addSalonDays(now, dayOffset + 28);
  const futureDay2 = addSalonDays(now, dayOffset + 29);
  const slot1 = salonDateAtTime(futureDay1, 11, 0);
  const slot2 = salonDateAtTime(futureDay1, 14, 0);
  const slot3 = salonDateAtTime(futureDay2, 11, 0);

  // Clean slots if previous run left appointments
  await prisma.appointment.deleteMany({
    where: {
      organizationId,
      staffId: specialist.id,
      startsAt: { in: [slot1, slot2, slot3] },
    },
  });

  let apptId: string | null = null;
  let companionApptId: string | null = null;
  let nearApptId: string | null = null;

  try {
    // 1. Create test appointment at slot1
    const created = await createAppointment({
      organizationId: organization.id,
      locationId: location.id,
      customerId: null,
      staffId: specialist.id,
      serviceIds: [service.id],
      startsAt: slot1,
      customerName: "Reschedule Verification Guest",
      customerPhone: "+639171234567",
      customerEmail: "reschedule-guest@beautybook.local",
    });
    apptId = created.id;

    assert(typeof created.rawToken === "string", "Raw token must exist");
    assert(isValidManagementTokenFormat(created.rawToken), "Raw token must have valid format");

    // 2. Eligibility check before reschedule
    const eligibility = canCustomerRescheduleAppointment(created);
    assert(eligibility.allowed, "Appointment > 24h ahead must be eligible for reschedule");

    // 3. Reject rescheduling to the exact same slot
    let sameSlotRejected = false;
    try {
      await rescheduleAppointmentByManagementToken({
        rawToken: created.rawToken,
        targetStartsAt: slot1,
      });
    } catch (err) {
      sameSlotRejected = err instanceof Error && err.message.includes("Please select a different time");
    }
    assert(sameSlotRejected, "Rescheduling to the exact same slot must be rejected");

    // 4. Reject rescheduling to a past or invalid time
    let pastSlotRejected = false;
    try {
      await rescheduleAppointmentByManagementToken({
        rawToken: created.rawToken,
        targetStartsAt: new Date(Date.now() - 3600_000),
      });
    } catch (err) {
      pastSlotRejected = err instanceof Error && err.message.includes("That time is not available");
    }
    assert(pastSlotRejected, "Rescheduling to past time must be rejected");

    // 5. Successful reschedule to slot2
    const res = await rescheduleAppointmentByManagementToken({
      rawToken: created.rawToken,
      targetStartsAt: slot2,
    });
    assert(res.success, "Reschedule should succeed");
    assert(res.appointment.id === created.id, "Appointment ID must be preserved");
    assert(
      res.appointment.managementTokenHash === created.managementTokenHash,
      "Management token hash must be preserved",
    );
    assert(
      new Date(res.appointment.startsAt).getTime() === slot2.getTime(),
      "startsAt must match new target slot",
    );

    // 6. Verify via getAppointmentByManagementToken
    const fetched = await getAppointmentByManagementToken(created.rawToken);
    assert(fetched !== null, "Appointment must still be retrievable by raw token");
    assert(fetched?.id === created.id, "Fetched ID must match original ID");
    assert(
      new Date(fetched!.startsAt).getTime() === slot2.getTime(),
      "Fetched startsAt must reflect rescheduled time",
    );
    assert(fetched?.customerName === "Reschedule Verification Guest", "Customer name preserved");
    assert(fetched?.services.length === 1, "Service snapshot preserved");

    // 7. Verify old slot (slot1) is freed and can be booked
    const rebookedOldSlot = await createAppointment({
      organizationId: organization.id,
      locationId: location.id,
      customerId: null,
      staffId: specialist.id,
      serviceIds: [service.id],
      startsAt: slot1,
      customerName: "New Guest In Old Slot",
      customerPhone: "+639178889999",
      customerEmail: "oldslot-guest@beautybook.local",
    });
    companionApptId = rebookedOldSlot.id;
    assert(rebookedOldSlot.id !== created.id, "Different appointment can now claim the freed slot");

    // 8. Verify target slot (slot2) is occupied and cannot be double-booked
    let collisionDetected = false;
    try {
      await createAppointment({
        organizationId: organization.id,
        locationId: location.id,
        customerId: null,
        staffId: specialist.id,
        serviceIds: [service.id],
        startsAt: slot2,
        customerName: "Colliding Guest",
        customerPhone: "+639170000000",
      });
    } catch (err) {
      collisionDetected = err instanceof Error && err.message.includes("That time is no longer available");
    }
    assert(collisionDetected, "Target slot must be blocked against double booking");

    // 9. Cutoff verification: Appointment within 24 hours cannot be rescheduled
    const nearStart = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const nearEnd = new Date(Date.now() + 2.5 * 60 * 60 * 1000);
    await prisma.appointment.deleteMany({
      where: {
        organizationId: organization.id,
        staffId: specialist.id,
        startsAt: { lt: nearEnd },
        endsAt: { gt: nearStart },
      },
    });

    const nearToken = generateAppointmentManagementToken();
    const nearAppt = await prisma.appointment.create({
      data: {
        organizationId: organization.id,
        locationId: location.id,
        staffId: specialist.id,
        startsAt: nearStart,
        endsAt: nearEnd,
        status: AppointmentStatus.CONFIRMED,
        customerName: "Near Future Guest",
        managementTokenHash: nearToken.tokenHash,
      },
    });
    nearApptId = nearAppt.id;

    const nearEligibility = canCustomerRescheduleAppointment(nearAppt);
    assert(!nearEligibility.allowed, "Appointment within 24 hours must not be eligible for reschedule");
    assert(
      typeof nearEligibility.reason === "string" &&
        nearEligibility.reason.includes("within 24 hours"),
      "Eligibility reason must state 24 hours",
    );

    let nearRescheduleRejected = false;
    try {
      await rescheduleAppointmentByManagementToken({
        rawToken: nearToken.rawToken,
        targetStartsAt: slot3,
      });
    } catch (err) {
      nearRescheduleRejected = err instanceof Error && err.message.includes("within 24 hours");
    }
    assert(nearRescheduleRejected, "Reschedule execution within 24h must be rejected by server");

    // 10. Cannot reschedule cancelled appointment
    await prisma.appointment.update({
      where: { id: nearAppt.id },
      data: { status: AppointmentStatus.CANCELLED },
    });
    let cancelledRescheduleRejected = false;
    try {
      await rescheduleAppointmentByManagementToken({
        rawToken: nearToken.rawToken,
        targetStartsAt: slot3,
      });
    } catch (err) {
      cancelledRescheduleRejected = err instanceof Error && err.message.includes("Cancelled appointments cannot be rescheduled");
    }
    assert(cancelledRescheduleRejected, "Cancelled appointment reschedule must be rejected");

    console.log("verify:reschedule passed");
  } finally {
    // Clean up test appointments
    const idsToDelete = [apptId, companionApptId, nearApptId].filter(
      (id): id is string => id !== null,
    );
    if (idsToDelete.length > 0) {
      await prisma.appointmentService.deleteMany({
        where: { appointmentId: { in: idsToDelete } },
      });
      await prisma.appointment.deleteMany({
        where: { id: { in: idsToDelete } },
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
