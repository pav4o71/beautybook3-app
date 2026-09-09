import "dotenv/config";
import { assertLocalOnlyDatabaseUrl } from "../../lib/test-only-local-db";
import { prisma } from "../../lib/prisma";
import { AppointmentStatus } from "../../app/generated/prisma/enums";
import {
  cancelAppointmentByManagementToken,
  canCustomerCancelAppointment,
  generateAppointmentManagementToken,
  getAppointmentByManagementToken,
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
  const futureDay = addSalonDays(now, dayOffset + 21);
  const futureStart = salonDateAtTime(futureDay, 11, 0);

  // Clean slot if previous run left an appointment
  await prisma.appointment.deleteMany({
    where: {
      organizationId,
      staffId: specialist.id,
      startsAt: futureStart,
    },
  });

  const created = await createAppointment({
    organizationId: organization.id,
    locationId: location.id,
    customerId: null,
    staffId: specialist.id,
    serviceIds: [service.id],
    startsAt: futureStart,
    customerName: "Cancel Verification Guest",
    customerPhone: "+639171234567",
    customerEmail: "cancel-guest@beautybook.local",
  });

  assert(typeof created.rawToken === "string", "Raw token must exist");
  assert(isValidManagementTokenFormat(created.rawToken), "Raw token must have valid format");

  // 2. Cancellation inside 24 hours must be rejected
  const nearStart = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours ahead
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

  let nearCutoffError = false;
  try {
    try {
      await cancelAppointmentByManagementToken({
        rawToken: nearToken.rawToken,
      });
    } catch (err) {
      nearCutoffError = true;
      assert(
        err instanceof Error && err.message.includes("24 hours"),
        "Error must mention 24 hours cutoff",
      );
    }
    assert(nearCutoffError, "Cancellation within 24h cutoff must fail");
  } finally {
    // Clean up nearAppt so subsequent runs do not conflict
    await prisma.appointment.delete({ where: { id: nearAppt.id } });
  }

  // 3. Past appointment must be rejected
  const pastAppt = {
    startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: AppointmentStatus.CONFIRMED,
  };
  const checkPast = canCustomerCancelAppointment(pastAppt);
  assert(!checkPast.allowed, "Past appointment canCustomerCancelAppointment must return false");

  // 4. Completed and No-show appointments must be rejected
  const completedAppt = {
    startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: AppointmentStatus.COMPLETED,
  };
  const checkCompleted = canCustomerCancelAppointment(completedAppt);
  assert(!checkCompleted.allowed, "COMPLETED appointment cannot be cancelled");

  const noShowAppt = {
    startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: AppointmentStatus.NO_SHOW,
  };
  const checkNoShow = canCustomerCancelAppointment(noShowAppt);
  assert(!checkNoShow.allowed, "NO_SHOW appointment cannot be cancelled");

  // 5. Invalid cancellation reason must be rejected
  let invalidReasonError = false;
  try {
    await cancelAppointmentByManagementToken({
      rawToken: created.rawToken,
      reason: "invalid_hacked_reason",
    });
  } catch (err) {
    invalidReasonError = true;
    assert(
      err instanceof Error && err.message.includes("reason"),
      "Error must mention invalid cancellation reason",
    );
  }
  assert(invalidReasonError, "Invalid reason must be rejected");

  // 6. Oversized note (>300 chars) must be rejected
  let oversizedNoteError = false;
  try {
    await cancelAppointmentByManagementToken({
      rawToken: created.rawToken,
      reason: "schedule_conflict",
      note: "x".repeat(301),
    });
  } catch (err) {
    oversizedNoteError = true;
    assert(
      err instanceof Error && err.message.includes("300 characters"),
      "Error must reject notes exceeding 300 characters",
    );
  }
  assert(oversizedNoteError, "Oversized note must be rejected");

  // 7. Successful cancellation of eligible appointment with valid reason & note
  const cancelRes = await cancelAppointmentByManagementToken({
    rawToken: created.rawToken,
    reason: "schedule_conflict",
    note: "Work meeting rescheduled.",
  });
  assert(cancelRes.success === true, "Cancellation must succeed");
  assert(cancelRes.alreadyCancelled === false, "First cancellation is not alreadyCancelled");

  // Verify DB state
  const updatedDb = await prisma.appointment.findUnique({
    where: { id: created.id },
  });
  if (!updatedDb) throw new Error("Appointment missing from DB");
  assert(updatedDb.status === AppointmentStatus.CANCELLED, "DB status must be CANCELLED");
  assert(updatedDb.cancelledAt !== null, "cancelledAt must be recorded");
  assert(updatedDb.cancelReason === "schedule_conflict", "cancelReason must be persisted");
  assert(updatedDb.cancelNote === "Work meeting rescheduled.", "cancelNote must be persisted");
  assert(updatedDb.customerName === "Cancel Verification Guest", "customerName snapshot preserved");
  assert(updatedDb.customerPhone === "+639171234567", "customerPhone snapshot preserved");
  assert(updatedDb.managementTokenHash === created.managementTokenHash, "managementTokenHash preserved");

  // 8. Idempotent cancellation: canceling again returns safe result without error
  const cancelSecond = await cancelAppointmentByManagementToken({
    rawToken: created.rawToken,
  });
  assert(cancelSecond.success === true, "Second cancellation must succeed safely");
  assert(cancelSecond.alreadyCancelled === true, "Second cancellation indicates alreadyCancelled");

  // 9. Receipt lookup after cancellation: remains resolvable via same token
  const resolved = await getAppointmentByManagementToken(created.rawToken);
  assert(resolved !== null, "Cancelled appointment must remain resolvable via token");
  assert(resolved?.status === AppointmentStatus.CANCELLED, "Resolved status must be CANCELLED");
  assert(resolved?.cancelledAt !== null, "Resolved cancelledAt must be populated");
  assert(resolved?.cancelReason === "schedule_conflict", "Resolved cancelReason must match");
  assert(resolved?.cancelNote === "Work meeting rescheduled.", "Resolved cancelNote must match");

  // 10. GiST slot release: creating a new appointment in the exact same slot must succeed now!
  const reusedSlot = await createAppointment({
    organizationId: organization.id,
    locationId: location.id,
    customerId: null,
    staffId: specialist.id,
    serviceIds: [service.id],
    startsAt: futureStart,
    customerName: "New Slot Booker",
  });
  assert(reusedSlot.id !== created.id, "New appointment created in released GiST slot");

  console.log("verify-cancellation: ok", {
    cancelledId: created.id,
    reusedSlotId: reusedSlot.id,
    cancellationReason: updatedDb.cancelReason,
    cancelledAt: updatedDb.cancelledAt?.toISOString(),
  });
}

main()
  .catch((err) => {
    console.error("verify-cancellation failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
