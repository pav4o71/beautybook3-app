import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  addSalonDays,
  salonDayBounds,
  salonTimeOnDay,
} from "@/lib/timezone";
import {
  getStaffSchedules,
  overlaps,
  slotBlockedByTimeOff,
  slotFitsStaffSchedule,
  slotOnBookingGrid,
  weekdayFromDate,
} from "@/lib/schedule";

export async function getAvailableSlots(input: {
  organizationId: string;
  staffId: string;
  durationMin: number;
  days?: number;
}) {
  const days = input.days ?? 7;
  const now = new Date();
  const { start: rangeStart } = salonDayBounds(now);
  const rangeEnd = addSalonDays(rangeStart, days);

  const [schedules, appointments, timeOff] = await Promise.all([
    prisma.staffSchedule.findMany({
      where: { staffId: input.staffId, organizationId: input.organizationId },
    }),
    prisma.appointment.findMany({
      where: {
        organizationId: input.organizationId,
        staffId: input.staffId,
        status: { not: AppointmentStatus.CANCELLED },
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.timeOff.findMany({
      where: {
        organizationId: input.organizationId,
        staffId: input.staffId,
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const slots: Date[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const dayStart = addSalonDays(rangeStart, offset);
    const weekday = weekdayFromDate(dayStart);
    const daySchedules = schedules.filter((row) => row.weekday === weekday);

    for (const schedule of daySchedules) {
      let cursor = salonTimeOnDay(dayStart, schedule.startTime);
      const end = salonTimeOnDay(dayStart, schedule.endTime);

      while (new Date(cursor.getTime() + input.durationMin * 60_000) <= end) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + input.durationMin * 60_000);
        const isFuture = slotStart > now;
        const isFree =
          appointments.every(
            (appointment) =>
              !overlaps(slotStart, slotEnd, appointment.startsAt, appointment.endsAt),
          ) && !slotBlockedByTimeOff(slotStart, slotEnd, timeOff);

        if (isFuture && isFree) {
          slots.push(slotStart);
        }

        cursor = new Date(cursor.getTime() + 30 * 60_000);
      }
    }
  }

  return slots;
}

function isAppointmentOverlapError(error: unknown) {
  if (error instanceof Error) {
    return (
      error.message.includes("Appointment_staff_no_overlap") ||
      error.message.includes("exclusion constraint") ||
      error.message.includes("23P01")
    );
  }
  return false;
}

export async function createAppointment(input: {
  organizationId: string;
  locationId: string;
  customerId: string | null;
  staffId: string;
  serviceId: string;
  startsAt: Date;
}) {
  const startsAt = input.startsAt;
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Invalid time selected.");
  }
  if (startsAt.getTime() <= Date.now()) {
    throw new Error("That time is not available.");
  }

  const [staffService, service, staff, schedules] = await Promise.all([
    prisma.staffService.findUnique({
      where: {
        staffId_serviceId: {
          staffId: input.staffId,
          serviceId: input.serviceId,
        },
      },
    }),
    prisma.service.findFirst({
      where: { id: input.serviceId, organizationId: input.organizationId },
    }),
    prisma.staff.findFirst({
      where: { id: input.staffId, organizationId: input.organizationId },
      select: { active: true, locationId: true },
    }),
    getStaffSchedules(input.organizationId, input.staffId),
  ]);

  if (!staff?.active) {
    throw new Error("That staff member is not available.");
  }
  if (!staffService || !service?.active) {
    throw new Error("That staff member does not offer this service.");
  }
  if (staff.locationId !== input.locationId) {
    throw new Error("That staff member is not available at this location.");
  }
  if (!slotOnBookingGrid(startsAt)) {
    throw new Error("That time is not available.");
  }
  if (!slotFitsStaffSchedule(schedules, startsAt, service.durationMin)) {
    throw new Error("That time is not available.");
  }

  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

  try {
    return await prisma.$transaction(async (tx) => {
      const clash = await tx.appointment.findFirst({
        where: {
          organizationId: input.organizationId,
          staffId: input.staffId,
          status: { not: AppointmentStatus.CANCELLED },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      });

      if (clash) {
        throw new Error("That time is no longer available.");
      }

      const timeOff = await tx.timeOff.findMany({
        where: {
          organizationId: input.organizationId,
          staffId: input.staffId,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { startsAt: true, endsAt: true },
      });

      if (slotBlockedByTimeOff(startsAt, endsAt, timeOff)) {
        throw new Error("That time is not available.");
      }

      return tx.appointment.create({
        data: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          customerId: input.customerId,
          staffId: input.staffId,
          startsAt,
          endsAt,
          status: AppointmentStatus.CONFIRMED,
          services: {
            create: {
              serviceId: service.id,
              durationMin: service.durationMin,
              priceCents: service.priceCents,
            },
          },
        },
      });
    });
  } catch (error) {
    if (isAppointmentOverlapError(error)) {
      throw new Error("That time is no longer available.");
    }
    throw error;
  }
}
