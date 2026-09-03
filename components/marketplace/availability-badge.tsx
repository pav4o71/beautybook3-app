import { formatNextAvailabilityLabel } from "@/lib/availability/format";
import type { NextAvailability } from "@/lib/availability/types";

export function AvailabilityBadge({
  value,
}: {
  value: NextAvailability | null | undefined;
}) {
  const label = formatNextAvailabilityLabel(value);
  if (!label) return null;

  const isEmpty = value?.kind === "none";

  return (
    <p
      className={`text-sm ${isEmpty ? "text-zinc-500" : "font-medium text-zinc-800"}`}
      data-testid="availability-badge"
    >
      {label}
    </p>
  );
}
