export type AvailabilityRelativeDay = "today" | "tomorrow" | "later";

/**
 * Next bookable slot for a salon (or honest empty after a real scan).
 * Never fabricate times — omit the badge if computation was skipped.
 */
export type NextAvailability =
  | {
      kind: "slot";
      startsAt: Date;
      relative: AvailabilityRelativeDay;
      serviceId: string;
      serviceName: string;
    }
  | {
      kind: "none";
      /** Inclusive end of the scanned Manila calendar window. */
      scannedThrough: Date;
    };

export type NextAvailabilityQuery = {
  organizationId: string;
  /** Prefer this service when present and staffed. */
  serviceId?: string;
  serviceName?: string;
  area?: string;
  /** Manila calendar days to scan from today (default 7). */
  horizonDays?: number;
};

export type QuickAvailabilityKey =
  | "today"
  | "tomorrow"
  | "weekend"
  | "open"
  | "earliest";

export function isQuickAvailabilityKey(value: string): value is QuickAvailabilityKey {
  return (
    value === "today" ||
    value === "tomorrow" ||
    value === "weekend" ||
    value === "open" ||
    value === "earliest"
  );
}
