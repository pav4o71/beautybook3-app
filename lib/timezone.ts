import type { Weekday } from "@/app/generated/prisma/enums";

/** Philippines has no DST — fixed UTC+8. Use Intl for calendar reads only. */
export const SALON_TIMEZONE = "Asia/Manila";

const SALON_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

const SALON_WEEKDAY: Record<string, Weekday> = {
  Mon: "MON",
  Tue: "TUE",
  Wed: "WED",
  Thu: "THU",
  Fri: "FRI",
  Sat: "SAT",
  Sun: "SUN",
};

type SalonCalendarParts = {
  year: number;
  month: number;
  day: number;
};

function readSalonParts(date: Date): SalonCalendarParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

/** Wall-clock instant in Asia/Manila as a UTC Date. */
export function salonWallToUtc(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  seconds = 0,
) {
  return new Date(
    Date.UTC(year, month - 1, day, hours, minutes, seconds, 0) - SALON_UTC_OFFSET_MS,
  );
}

export function salonCalendarParts(date: Date = new Date()): SalonCalendarParts {
  return readSalonParts(date);
}

export function salonDayBounds(anchor: Date = new Date()) {
  const { year, month, day } = readSalonParts(anchor);
  const start = salonWallToUtc(year, month, day, 0, 0);
  const nextDayUtc = new Date(Date.UTC(year, month - 1, day));
  nextDayUtc.setUTCDate(nextDayUtc.getUTCDate() + 1);
  const end = salonWallToUtc(
    nextDayUtc.getUTCFullYear(),
    nextDayUtc.getUTCMonth() + 1,
    nextDayUtc.getUTCDate(),
    0,
    0,
  );
  return { start, end };
}

export function salonWeekdayFromDate(date: Date): Weekday {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TIMEZONE,
    weekday: "short",
  }).format(date);

  const mapped = SALON_WEEKDAY[weekday];
  if (!mapped) {
    throw new Error(`Unexpected salon weekday label: ${weekday}`);
  }
  return mapped;
}

export function salonDateAtTime(
  anchor: Date,
  hours: number,
  minutes: number,
  seconds = 0,
) {
  const { year, month, day } = readSalonParts(anchor);
  return salonWallToUtc(year, month, day, hours, minutes, seconds);
}

export function salonTimeOnDay(dayStart: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const { year, month, day } = readSalonParts(dayStart);
  return salonWallToUtc(year, month, day, hours, minutes);
}

export function addSalonDays(dayStart: Date, days: number) {
  return new Date(dayStart.getTime() + days * 86_400_000);
}

export function salonDaysAgo(days: number, anchor: Date = new Date()) {
  return new Date(anchor.getTime() - days * 86_400_000);
}
