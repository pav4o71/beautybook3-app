import { formatDay, formatTime } from "@/lib/format";
import type { NextAvailability } from "@/lib/availability/types";

/** Human label for card badges — never invents a time. */
export function formatNextAvailabilityLabel(
  value: NextAvailability | null | undefined,
): string | null {
  if (!value) return null;
  if (value.kind === "none") {
    return "No availability this week";
  }

  const time = formatTime(value.startsAt);
  if (value.relative === "today") {
    return `Next available today at ${time}`;
  }
  if (value.relative === "tomorrow") {
    return `Available tomorrow from ${time}`;
  }
  return `Next available ${formatDay(value.startsAt)} at ${time}`;
}
