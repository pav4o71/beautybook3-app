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

export const DEFAULT_CUTOFF_HOURS = 168;
export const MIN_CUTOFF_HOURS = 0;
export const MAX_CUTOFF_HOURS = 168; // 7 days

/** @deprecated Use DEFAULT_CUTOFF_HOURS or organization.cancellationCutoffHours */
export const CANCELLATION_CUTOFF_HOURS = DEFAULT_CUTOFF_HOURS;

export function validateCutoffHours(
  val: unknown,
): { ok: true; hours: number } | { ok: false; error: string } {
  const num = typeof val === "number" ? val : Number(val);
  if (!Number.isInteger(num) || Number.isNaN(num)) {
    return { ok: false, error: "Cutoff must be a whole number of hours." };
  }
  if (num < MIN_CUTOFF_HOURS || num > MAX_CUTOFF_HOURS) {
    return {
      ok: false,
      error: `Cutoff must be between ${MIN_CUTOFF_HOURS} and ${MAX_CUTOFF_HOURS} hours (up to 7 days).`,
    };
  }
  return { ok: true, hours: num };
}

