import {
  addSalonDays,
  parseSalonTime,
  salonDayBounds,
  salonIsoDate,
  salonMinutesOfDay,
  salonWeekdayFromDate,
} from "@/lib/timezone";
import type { QuickAvailabilityKey } from "@/lib/availability/types";

export type ResolvedQuickAvailability = {
  key: QuickAvailabilityKey;
  /** Primary date for single-day filters. */
  date?: Date;
  /** Extra dates (weekend / earliest scan). */
  dates?: Date[];
  /** Preferred time HH:MM for open-now windowing. */
  time?: string;
  label: string;
};

function roundDownToHalfHour(minutes: number) {
  return Math.floor(minutes / 30) * 30;
}

function minutesToHhMm(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Next Saturday and Sunday in Manila from today (including today if weekend). */
export function upcomingWeekendDates(anchor: Date = new Date()): Date[] {
  const todayStart = salonDayBounds(anchor).start;
  const dates: Date[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addSalonDays(todayStart, offset);
    const weekday = salonWeekdayFromDate(day);
    if (weekday === "SAT" || weekday === "SUN") {
      dates.push(day);
    }
  }
  return dates;
}

/** Manila calendar days from today through horizon (inclusive count). */
export function horizonDates(days: number, anchor: Date = new Date()): Date[] {
  const todayStart = salonDayBounds(anchor).start;
  return Array.from({ length: days }, (_, offset) => addSalonDays(todayStart, offset));
}

export function resolveQuickAvailability(
  key: QuickAvailabilityKey,
  now: Date = new Date(),
): ResolvedQuickAvailability {
  const todayStart = salonDayBounds(now).start;
  const tomorrow = addSalonDays(todayStart, 1);

  switch (key) {
    case "today":
      return { key, date: todayStart, label: "Available today" };
    case "tomorrow":
      return { key, date: tomorrow, label: "Available tomorrow" };
    case "weekend":
      return {
        key,
        dates: upcomingWeekendDates(now),
        label: "This weekend",
      };
    case "open": {
      const minutes = roundDownToHalfHour(salonMinutesOfDay(now));
      return {
        key,
        date: todayStart,
        time: minutesToHhMm(minutes),
        label: "Open now",
      };
    }
    case "earliest":
      return {
        key,
        dates: horizonDates(7, now),
        label: "Earliest available",
      };
  }
}

export function quickAvailabilityFromQuery(input: {
  avail?: string;
  date?: string;
  time?: string;
}): QuickAvailabilityKey | undefined {
  if (input.avail === "today") return "today";
  if (input.avail === "tomorrow") return "tomorrow";
  if (input.avail === "weekend") return "weekend";
  if (input.avail === "open") return "open";
  if (input.avail === "earliest") return "earliest";
  return undefined;
}

/** Round-trip helpers for URL building. */
export function quickFilterHrefParams(
  key: QuickAvailabilityKey,
  now: Date = new Date(),
): { avail: QuickAvailabilityKey; date?: string; time?: string } {
  const resolved = resolveQuickAvailability(key, now);
  if (key === "weekend" || key === "earliest") {
    return { avail: key };
  }
  return {
    avail: key,
    date: resolved.date ? salonIsoDate(resolved.date) : undefined,
    time: resolved.time,
  };
}

export function isValidPreferredTime(value: string | undefined) {
  return value != null && parseSalonTime(value) != null;
}
