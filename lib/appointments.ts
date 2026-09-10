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

export async function getCustomerAppointments(
  organizationId: string,
  customerId: string,
) {
  const now = new Date();
  const recentCutoff = salonDaysAgo(7, now);

  return prisma.appointment.findMany({
    where: {
      organizationId,
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

export async function getAppointmentsForDay(
  organizationId: string,
  day: Date = new Date(),
  locationId?: string,
) {
  const { start, end } = salonDayBounds(day);

  return prisma.appointment.findMany({
    where: {
      organizationId,
      startsAt: { gte: start, lt: end },
      ...(locationId ? { locationId } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
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
  organizationId: string;
  appointmentId: string;
  status: AdminSettableStatus;
}) {
  const result = await prisma.appointment.updateMany({
    where: {
      id: input.appointmentId,
      organizationId: input.organizationId,
      status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
    },
    data: {
      status: input.status,
      ...(input.status === AppointmentStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
    },
  });

  if (result.count === 0) {
    const existing = await prisma.appointment.findFirst({
      where: { id: input.appointmentId, organizationId: input.organizationId },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new Error("Appointment not found.");
    }

    throw new Error("This appointment can no longer be updated.");
  }

  return prisma.appointment.findUniqueOrThrow({
    where: { id: input.appointmentId },
  });
}

export interface AppointmentContactDisplay {
  hasContactSnapshot: boolean;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
}

export function getAppointmentContactDisplay(appointment: {
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}): AppointmentContactDisplay {
  const hasContactSnapshot =
    appointment.customerName != null ||
    appointment.customerPhone != null ||
    appointment.customerEmail != null;

  if (hasContactSnapshot) {
    return {
      hasContactSnapshot: true,
      customerName: appointment.customerName || "Walk-in",
      customerPhone: appointment.customerPhone ?? null,
      customerEmail: appointment.customerEmail ?? null,
    };
  }

  const legacyName = appointment.customer?.name ?? null;
  const legacyEmail = appointment.customer?.email ?? null;
  const legacyPhone = appointment.customer?.phone ?? null;

  return {
    hasContactSnapshot: false,
    customerName: legacyName || legacyEmail || "Walk-in",
    customerPhone: legacyPhone,
    customerEmail: legacyName && legacyEmail ? legacyEmail : null,
  };
}

