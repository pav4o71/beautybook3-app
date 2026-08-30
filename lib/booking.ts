import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  MAX_BOOKING_SERVICES,
  MAX_COMBINED_DURATION_MIN,
} from "@/lib/booking-limits";
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

type SlotQuery = {
  organizationId: string;
  staffId: string;
  durationMin: number;
  rangeStart: Date;
  rangeEnd: Date;
  dayCount: number;
};

async function collectAvailableSlots(input: SlotQuery) {
  const now = new Date();
  const [schedules, appointments, timeOff] = await Promise.all([
    prisma.staffSchedule.findMany({
      where: { staffId: input.staffId, organizationId: input.organizationId },
    }),
    prisma.appointment.findMany({
      where: {
        organizationId: input.organizationId,
        staffId: input.staffId,
        status: { not: AppointmentStatus.CANCELLED },
        startsAt: { lt: input.rangeEnd },
        endsAt: { gt: input.rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.timeOff.findMany({
      where: {
        organizationId: input.organizationId,
        staffId: input.staffId,
        startsAt: { lt: input.rangeEnd },
        endsAt: { gt: input.rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const slots: Date[] = [];

  for (let offset = 0; offset < input.dayCount; offset += 1) {
    const dayStart = addSalonDays(input.rangeStart, offset);
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

export async function getAvailableSlots(input: {
  organizationId: string;
  staffId: string;
  durationMin: number;
  days?: number;
}) {
  const days = input.days ?? 7;
  const { start: rangeStart } = salonDayBounds();
  return collectAvailableSlots({
    organizationId: input.organizationId,
    staffId: input.staffId,
    durationMin: input.durationMin,
    rangeStart,
    rangeEnd: addSalonDays(rangeStart, days),
    dayCount: days,
  });
}

export async function getAvailableSlotsForDay(input: {
  organizationId: string;
  staffId: string;
  durationMin: number;
  date: Date;
}) {
  const { start: rangeStart, end: rangeEnd } = salonDayBounds(input.date);
  return collectAvailableSlots({
    organizationId: input.organizationId,
    staffId: input.staffId,
    durationMin: input.durationMin,
    rangeStart,
    rangeEnd,
    dayCount: 1,
  });
}

export { staffOffersAllServices } from "@/lib/booking-limits";

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
  serviceIds: string[];
  startsAt: Date;
}) {
  const startsAt = input.startsAt;
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Invalid time selected.");
  }
  if (startsAt.getTime() <= Date.now()) {
    throw new Error("That time is not available.");
  }

  const uniqueIds = [...new Set(input.serviceIds.filter((id) => id.length > 0))];
  if (uniqueIds.length === 0) {
    throw new Error("Choose at least one service.");
  }
  if (uniqueIds.length !== input.serviceIds.filter((id) => id.length > 0).length) {
    throw new Error("Each service can only be added once.");
  }
  if (uniqueIds.length > MAX_BOOKING_SERVICES) {
    throw new Error(`You can book at most ${MAX_BOOKING_SERVICES} services.`);
  }

  const [services, staffLinks, staff, schedules] = await Promise.all([
    prisma.service.findMany({
      where: {
        id: { in: uniqueIds },
        organizationId: input.organizationId,
      },
    }),
    prisma.staffService.findMany({
      where: {
        staffId: input.staffId,
        serviceId: { in: uniqueIds },
      },
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
  if (staff.locationId !== input.locationId) {
    throw new Error("That staff member is not available at this location.");
  }
  if (services.length !== uniqueIds.length || services.some((service) => !service.active)) {
    throw new Error("One or more services are not available.");
  }

  const offeredIds = new Set(staffLinks.map((row) => row.serviceId));
  if (!uniqueIds.every((id) => offeredIds.has(id))) {
    throw new Error("That staff member does not offer every selected service.");
  }

  const durationMin = services.reduce((sum, service) => sum + service.durationMin, 0);
  if (durationMin > MAX_COMBINED_DURATION_MIN) {
    throw new Error(
      `Combined duration cannot exceed ${MAX_COMBINED_DURATION_MIN} minutes.`,
    );
  }

  if (!slotOnBookingGrid(startsAt)) {
    throw new Error("That time is not available.");
  }
  if (!slotFitsStaffSchedule(schedules, startsAt, durationMin)) {
    throw new Error("That time is not available.");
  }

  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
  const servicesById = new Map(services.map((service) => [service.id, service]));

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
            create: uniqueIds.map((serviceId) => {
              const service = servicesById.get(serviceId);
              if (!service) {
                throw new Error("One or more services are not available.");
              }
              return {
                serviceId: service.id,
                durationMin: service.durationMin,
                priceCents: service.priceCents,
              };
            }),
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
