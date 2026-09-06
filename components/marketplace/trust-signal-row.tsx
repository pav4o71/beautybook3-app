import type { SalonTrustSignals } from "@/lib/trust/types";

/**
 * Renders at most a few truthful signals. Null/unsupported fields are omitted —
 * never invent ratings or popularity.
 */
export function TrustSignalRow({
  trust,
  className = "",
}: {
  trust: SalonTrustSignals;
  className?: string;
}) {
  const items: string[] = [];

  if (trust.primaryArea) {
    items.push(trust.primaryArea);
  }
  if (
    trust.averageRating != null &&
    trust.reviewCount != null &&
    trust.reviewCount > 0
  ) {
    items.push(`${trust.averageRating.toFixed(1)} · ${trust.reviewCount} reviews`);
  }
  if (trust.verifiedBusiness) {
    items.push("Verified business");
  }
  if (trust.popularLabel) {
    items.push(trust.popularLabel);
  }
  if (trust.cancellationFlexibility) {
    items.push(trust.cancellationFlexibility);
  }
  if (trust.distanceKm != null) {
    items.push(`${trust.distanceKm.toFixed(1)} km`);
  }

  if (items.length === 0) return null;

  const shown = items.slice(0, 3);

  return (
    <p
      className={`text-xs text-zinc-500 ${className}`}
      data-testid="trust-signal-row"
    >
      {shown.join(" · ")}
    </p>
  );
}
