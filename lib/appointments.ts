import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { salonDayBounds, salonDaysAgo } from "@/lib/timezone";

export type AdminSettableStatus = Extract<
  AppointmentStatus,
  "COMPLETED" | "NO_SHOW" | "CANCELLED"
>;

export function parseAdminSettableStatus(value: string): AdminSettableStatus {
  if (
    value === AppointmentStatus.COMPLETED ||
    value === AppointmentStatus.NO_SHOW ||
    value === AppointmentStatus.CANCELLED
  ) {
    return value;
  }

  throw new Error("Invalid status.");
}

export async function getCustomerAppointments(customerId: string) {
  const now = new Date();
  const recentCutoff = salonDaysAgo(7, now);

  return prisma.appointment.findMany({
    where: {
      customerId,
      status: { not: AppointmentStatus.CANCELLED },
      OR: [{ startsAt: { gte: now } }, { startsAt: { gte: recentCutoff, lt: now } }],
    },
    include: {
      staff: true,
      services: {
        include: { service: true },
        orderBy: { service: { name: "asc" } },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function getAppointmentsForDay(day: Date = new Date()) {
  const { start, end } = salonDayBounds(day);

  return prisma.appointment.findMany({
    where: {
      startsAt: { gte: start, lt: end },
    },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      staff: true,
      services: {
        include: { service: true },
        orderBy: { service: { name: "asc" } },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function updateAppointmentStatus(input: {
  appointmentId: string;
  status: AdminSettableStatus;
}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: { id: true, status: true },
  });

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  if (
    appointment.status !== AppointmentStatus.CONFIRMED &&
    appointment.status !== AppointmentStatus.PENDING
  ) {
    throw new Error("This appointment can no longer be updated.");
  }

  return prisma.appointment.update({
    where: { id: input.appointmentId },
    data: { status: input.status },
  });
}
