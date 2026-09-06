/**
 * Trust metadata for salon cards and storefronts.
 * Nullable fields must stay hidden in the UI until real data exists.
 * Do not invent ratings, review counts, or popularity.
 */
export type SalonTrustSignals = {
  /** Average star rating 1–5 when reviews exist. */
  averageRating: number | null;
  reviewCount: number | null;
  /** Business identity verified by the platform (future). */
  verifiedBusiness: boolean | null;
  /** Primary Manila area label for display. */
  primaryArea: string | null;
  /** Distance in km when geo is available (future). */
  distanceKm: number | null;
  /** Popular/trending only when backed by real metrics (future). */
  popularLabel: string | null;
  /** Short cancellation flexibility summary (future). */
  cancellationFlexibility: string | null;
};

export function emptyTrustSignals(
  overrides: Partial<SalonTrustSignals> = {},
): SalonTrustSignals {
  return {
    averageRating: null,
    reviewCount: null,
    verifiedBusiness: null,
    primaryArea: null,
    distanceKm: null,
    popularLabel: null,
    cancellationFlexibility: null,
    ...overrides,
  };
}
