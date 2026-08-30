import "dotenv/config";
import { AppointmentStatus } from "../../app/generated/prisma/enums";
import { createAppointment, getAvailableSlots } from "../../lib/booking";
import {
  getAppointmentsForDay,
  updateAppointmentStatus,
} from "../../lib/appointments";
import { salonDayBounds } from "../../lib/timezone";
import { prisma } from "../../lib/prisma";
import { getDemoTenantContext } from "../../lib/tenant";

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

async function pickOpenSlot(input: {
  organizationId: string;
  staffId: string;
  durationMin: number;
  exclude: Date[];
}) {
  const slots = await getAvailableSlots({
    organizationId: input.organizationId,
    staffId: input.staffId,
    durationMin: input.durationMin,
    days: 14,
  });
  const excludeTimes = new Set(input.exclude.map((slot) => slot.getTime()));
  const open = slots.filter((slot) => !excludeTimes.has(slot.getTime()));
  assert(open.length > 0, "Need open slots for appointment status tests");

  return (
    open.find((slot) => slot.getTime() > Date.now() + 86_400_000) ??
    open[open.length - 1]
  );
}

async function main() {
  const tenant = await getDemoTenantContext();
  const customer = await prisma.user.findFirstOrThrow({
    where: { email: "customer@beautybook.local" },
  });
  const cut = await prisma.service.findFirstOrThrow({ where: { name: "Haircut" } });
  const maya = await prisma.staff.findFirstOrThrow({ where: { name: "Maya Petrova" } });

  const usedSlots: Date[] = [];

  const bookSlot = await pickOpenSlot({
    organizationId: tenant.organizationId,
    staffId: maya.id,
    durationMin: cut.durationMin,
    exclude: usedSlots,
  });
  usedSlots.push(bookSlot);

  const created = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: customer.id,
    staffId: maya.id,
    serviceId: cut.id,
    startsAt: bookSlot,
  });

  const noShowSlot = await pickOpenSlot({
    organizationId: tenant.organizationId,
    staffId: maya.id,
    durationMin: cut.durationMin,
    exclude: usedSlots,
  });
  usedSlots.push(noShowSlot);

  const noShowAppointment = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: customer.id,
    staffId: maya.id,
    serviceId: cut.id,
    startsAt: noShowSlot,
  });

  const cancelledSlot = await pickOpenSlot({
    organizationId: tenant.organizationId,
    staffId: maya.id,
    durationMin: cut.durationMin,
    exclude: usedSlots,
  });

  const cancelledAppointment = await createAppointment({
    organizationId: tenant.organizationId,
    locationId: tenant.locationId,
    customerId: customer.id,
    staffId: maya.id,
    serviceId: cut.id,
    startsAt: cancelledSlot,
  });

  await updateAppointmentStatus({
    organizationId: tenant.organizationId,
    appointmentId: created.id,
    status: AppointmentStatus.COMPLETED,
  });

  const completed = await prisma.appointment.findUniqueOrThrow({
    where: { id: created.id },
  });
  assert(completed.status === AppointmentStatus.COMPLETED, "Status should be COMPLETED");

  await expectRejects(
    () =>
      updateAppointmentStatus({
        organizationId: tenant.organizationId,
        appointmentId: created.id,
        status: AppointmentStatus.CANCELLED,
      }),
    "This appointment can no longer be updated.",
  );

  await updateAppointmentStatus({
    organizationId: tenant.organizationId,
    appointmentId: noShowAppointment.id,
    status: AppointmentStatus.NO_SHOW,
  });

  await updateAppointmentStatus({
    organizationId: tenant.organizationId,
    appointmentId: cancelledAppointment.id,
    status: AppointmentStatus.CANCELLED,
  });

  const { start, end } = salonDayBounds();
  const todayBoard = await getAppointmentsForDay(tenant.organizationId);
  for (const row of todayBoard) {
    assert(
      row.startsAt >= start && row.startsAt < end,
      "Today's board should only include appointments starting today",
    );
  }

  await prisma.appointment.deleteMany({
    where: {
      id: { in: [created.id, noShowAppointment.id, cancelledAppointment.id] },
    },
  });

  await prisma.$disconnect();

  console.log("verify-appointments: ok", {
    completed: created.id,
    noShow: noShowAppointment.id,
    cancelled: cancelledAppointment.id,
    todayBoardCount: todayBoard.length,
  });
}

main().catch((error) => {
  console.error("verify-appointments: failed", error);
  process.exitCode = 1;
});
