export const CANCELLATION_REASONS = [
  { value: "schedule_conflict", label: "Schedule conflict" },
  { value: "illness", label: "Illness or emergency" },
  { value: "booked_by_mistake", label: "Booked by mistake" },
  { value: "other", label: "Other" },
] as const;

export type CancellationReasonValue = (typeof CANCELLATION_REASONS)[number]["value"];

export const ALLOWED_CANCELLATION_REASONS: Set<string> = new Set(
  CANCELLATION_REASONS.map((r) => r.value),
);

export const CANCELLATION_CUTOFF_HOURS = 24;
