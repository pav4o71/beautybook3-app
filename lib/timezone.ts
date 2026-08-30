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

export function salonIsoDate(date: Date = new Date()) {
  const { year, month, day } = readSalonParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseSalonIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = salonWallToUtc(year, month, day, 0, 0);
  const parts = readSalonParts(parsed);
  if (parts.year !== year || parts.month !== month || parts.day !== day) {
    return null;
  }
  return parsed;
}

export function salonMinutesOfDay(date: Date) {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: SALON_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  const [hours, minutes] = formatted.split(":").map(Number);
  return hours * 60 + minutes;
}

export function parseSalonTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
