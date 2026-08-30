import type { Weekday } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const WEEKDAY_ORDER: Weekday[] = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

export function weekdayLabel(weekday: Weekday) {
  const labels: Record<Weekday, string> = {
    MON: "Monday",
    TUE: "Tuesday",
    WED: "Wednesday",
    THU: "Thursday",
    FRI: "Friday",
    SAT: "Saturday",
    SUN: "Sunday",
  };
  return labels[weekday];
}

export function orderedWeekdays() {
  return WEEKDAY_ORDER;
}

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

const JS_DAY_TO_WEEKDAY: Weekday[] = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
];

export function weekdayFromDate(date: Date): Weekday {
  return JS_DAY_TO_WEEKDAY[date.getDay()];
}

function atTimeOnDay(day: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(day);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

/** Matches the 30-minute grid used by getAvailableSlots. */
export function slotOnBookingGrid(startsAt: Date) {
  return (
    startsAt.getSeconds() === 0 &&
    startsAt.getMilliseconds() === 0 &&
    startsAt.getMinutes() % 30 === 0
  );
}

export function slotFitsStaffSchedule(
  schedules: { weekday: Weekday; startTime: string; endTime: string }[],
  startsAt: Date,
  durationMin: number,
) {
  const day = new Date(startsAt);
  day.setHours(0, 0, 0, 0);
  const weekday = weekdayFromDate(startsAt);
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
  const daySchedules = schedules.filter((row) => row.weekday === weekday);

  return daySchedules.some((schedule) => {
    const windowStart = atTimeOnDay(day, schedule.startTime);
    const windowEnd = atTimeOnDay(day, schedule.endTime);
    return startsAt >= windowStart && endsAt <= windowEnd;
  });
}

export function slotBlockedByTimeOff(
  slotStart: Date,
  slotEnd: Date,
  timeOff: { startsAt: Date; endsAt: Date }[],
) {
  return timeOff.some((block) =>
    overlaps(slotStart, slotEnd, block.startsAt, block.endsAt),
  );
}

export async function getStaffTimeOffInRange(
  staffId: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  return prisma.timeOff.findMany({
    where: {
      staffId,
      startsAt: { lt: rangeEnd },
      endsAt: { gt: rangeStart },
    },
    select: { startsAt: true, endsAt: true },
  });
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validateTimeWindow(startTime: string, endTime: string) {
  if (!TIME_PATTERN.test(startTime)) {
    return { ok: false as const, error: "Invalid start time." };
  }
  if (!TIME_PATTERN.test(endTime)) {
    return { ok: false as const, error: "Invalid end time." };
  }
  if (startTime >= endTime) {
    return { ok: false as const, error: "Start time must be before end time." };
  }
  return { ok: true as const };
}

export async function getStaffSchedules(staffId: string) {
  return prisma.staffSchedule.findMany({
    where: { staffId },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
}

export async function saveStaffWeekday(
  staffId: string,
  weekday: Weekday,
  windows: { startTime: string; endTime: string }[],
) {
  for (const window of windows) {
    const valid = validateTimeWindow(window.startTime, window.endTime);
    if (!valid.ok) {
      throw new Error(`${weekdayLabel(weekday)}: ${valid.error}`);
    }
  }

  await prisma.$transaction([
    prisma.staffSchedule.deleteMany({ where: { staffId, weekday } }),
    ...(windows.length > 0
      ? [
          prisma.staffSchedule.createMany({
            data: windows.map((window) => ({
              staffId,
              weekday,
              startTime: window.startTime,
              endTime: window.endTime,
            })),
          }),
        ]
      : []),
  ]);
}

export async function listStaffTimeOff(staffId: string) {
  const now = new Date();
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - 7);

  return prisma.timeOff.findMany({
    where: {
      staffId,
      endsAt: { gte: recentCutoff },
    },
    orderBy: { startsAt: "asc" },
  });
}

export function parseLocalDateTime(dateValue: string, timeValue: string) {
  const date = dateValue.trim();
  const time = timeValue.trim();
  if (!date || !time) {
    throw new Error("Date and time are required.");
  }
  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date or time.");
  }
  return parsed;
}

const WEEKDAY_SHORT: Record<Weekday, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

function weekdayIndex(weekday: Weekday) {
  return WEEKDAY_ORDER.indexOf(weekday);
}

function compressWeekdayRanges(days: Weekday[]) {
  const sorted = [...days].sort((a, b) => weekdayIndex(a) - weekdayIndex(b));
  const parts: string[] = [];
  let index = 0;

  while (index < sorted.length) {
    let end = index;
    while (
      end + 1 < sorted.length &&
      weekdayIndex(sorted[end + 1]) === weekdayIndex(sorted[end]) + 1
    ) {
      end += 1;
    }

    if (end - index >= 2) {
      parts.push(`${WEEKDAY_SHORT[sorted[index]]}–${WEEKDAY_SHORT[sorted[end]]}`);
    } else if (end === index) {
      parts.push(WEEKDAY_SHORT[sorted[index]]);
    } else {
      parts.push(`${WEEKDAY_SHORT[sorted[index]]}, ${WEEKDAY_SHORT[sorted[end]]}`);
    }

    index = end + 1;
  }

  return parts.join(", ");
}

export function summarizeStaffSchedule(
  schedules: { weekday: Weekday; startTime: string; endTime: string }[],
) {
  if (schedules.length === 0) {
    return "No hours set";
  }

  const groups = new Map<string, Weekday[]>();

  for (const row of schedules) {
    const key = `${row.startTime}–${row.endTime}`;
    const days = groups.get(key) ?? [];
    if (!days.includes(row.weekday)) {
      days.push(row.weekday);
    }
    groups.set(key, days);
  }

  return Array.from(groups.entries())
    .map(([window, days]) => `${compressWeekdayRanges(days)} ${window}`)
    .join("; ");
}
