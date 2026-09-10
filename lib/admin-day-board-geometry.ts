import type { Weekday } from "@/app/generated/prisma/enums";
import { parseSalonTime, salonMinutesOfDay, salonWeekdayFromDate } from "./timezone";

export const DEFAULT_START_HOUR = 8; // 08:00 (480 min)
export const DEFAULT_END_HOUR = 19; // 19:00 (1140 min)
export const STEP_MINUTES = 30; // 30-minute interval
export const PIXELS_PER_MINUTE = 2; // 30 min = 60px, 60 min = 120px, 90 min = 180px

export interface TimeMarker {
  minutes: number;
  label: string;
  topPx: number;
  isHour: boolean;
}

export interface VisibleRange {
  startMinutes: number;
  endMinutes: number;
  totalMinutes: number;
  totalHeightPx: number;
}

export interface ScheduleRangeInput {
  dayOfWeek?: Weekday;
  weekday?: Weekday;
  startMinutes?: number;
  endMinutes?: number;
  startTime?: string;
  endTime?: string;
  active?: boolean;
}

export interface AppointmentRangeInput {
  startsAt: Date;
  endsAt: Date;
  status?: string;
}

/**
 * Formats minutes from midnight into 24-hour HH:MM string.
 */
export function formatMinutesToTimeString(minutes: number): string {
  const clamped = Math.max(0, Math.min(1440, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Calculates the visible range for the day board based on active staff schedules and appointments.
 */
export function deriveVisibleRange(
  selectedDate: Date,
  schedules: ScheduleRangeInput[] = [],
  appointments: AppointmentRangeInput[] = [],
  fallbackStartHour = DEFAULT_START_HOUR,
  fallbackEndHour = DEFAULT_END_HOUR,
): VisibleRange {
  const currentWeekday = salonWeekdayFromDate(selectedDate);
  const relevantSchedules = schedules.filter((s) => {
    const day = s.dayOfWeek ?? s.weekday;
    return day === currentWeekday && (s.active === undefined || s.active);
  });

  let minMinutes = fallbackStartHour * 60;
  let maxMinutes = fallbackEndHour * 60;

  for (const s of relevantSchedules) {
    const start =
      s.startMinutes ?? (s.startTime ? parseSalonTime(s.startTime) : null);
    const end =
      s.endMinutes ?? (s.endTime ? parseSalonTime(s.endTime) : null);
    if (start !== null && start !== undefined && start < minMinutes) minMinutes = start;
    if (end !== null && end !== undefined && end > maxMinutes) maxMinutes = end;
  }

  for (const a of appointments) {
    const start = salonMinutesOfDay(a.startsAt);
    const end = salonMinutesOfDay(a.endsAt);
    if (start < minMinutes) minMinutes = start;
    if (end > maxMinutes) maxMinutes = end;
  }

  // Snap to 30-minute boundaries
  const startMinutes = Math.floor(minMinutes / STEP_MINUTES) * STEP_MINUTES;
  const endMinutes = Math.ceil(maxMinutes / STEP_MINUTES) * STEP_MINUTES;
  const safeEndMinutes = Math.max(startMinutes + 120, endMinutes); // Minimum 2 hours
  const totalMinutes = safeEndMinutes - startMinutes;
  const totalHeightPx = totalMinutes * PIXELS_PER_MINUTE;

  return {
    startMinutes,
    endMinutes: safeEndMinutes,
    totalMinutes,
    totalHeightPx,
  };
}

/**
 * Builds 30-minute interval time markers for the timeline time gutter.
 */
export function buildTimeMarkers(
  startMinutes: number,
  endMinutes: number,
  stepMinutes = STEP_MINUTES,
  pixelsPerMinute = PIXELS_PER_MINUTE,
): TimeMarker[] {
  const markers: TimeMarker[] = [];
  for (let m = startMinutes; m <= endMinutes; m += stepMinutes) {
    const offsetMinutes = m - startMinutes;
    markers.push({
      minutes: m,
      label: formatMinutesToTimeString(m),
      topPx: offsetMinutes * pixelsPerMinute,
      isHour: m % 60 === 0,
    });
  }
  return markers;
}

/**
 * Calculates minutes elapsed between visible board start and the appointment startsAt.
 */
export function minutesSinceBoardStart(startsAt: Date, boardStartMinutes: number): number {
  return salonMinutesOfDay(startsAt) - boardStartMinutes;
}

/**
 * Calculates the vertical pixel top position of an appointment card on the timeline.
 */
export function appointmentTop(
  startsAt: Date,
  boardStartMinutes: number,
  pixelsPerMinute = PIXELS_PER_MINUTE,
): number {
  const elapsed = minutesSinceBoardStart(startsAt, boardStartMinutes);
  return Math.max(0, elapsed * pixelsPerMinute);
}

/**
 * Calculates the vertical pixel height of an appointment card based on committed interval (endsAt - startsAt).
 */
export function appointmentHeight(
  startsAt: Date,
  endsAt: Date,
  pixelsPerMinute = PIXELS_PER_MINUTE,
): number {
  const durationMin = Math.max(15, (endsAt.getTime() - startsAt.getTime()) / 60_000);
  return durationMin * pixelsPerMinute;
}

/**
 * Calculates committed booking snapshot duration in minutes from AppointmentService records.
 */
export function getAppointmentSnapshotDuration(
  services: { durationMin: number }[],
): number {
  return services.reduce((sum, row) => sum + row.durationMin, 0);
}
