/**
 * Feature flags for unfinished / premium surfaces.
 * Unfinished routes stay off by default — never invent production data behind a flag.
 */
export const featureFlags = {
  bookTheLook: process.env.FEATURE_BOOK_THE_LOOK === "1",
  beautyQuiz: process.env.FEATURE_BEAUTY_QUIZ === "1",
  loyalty: process.env.FEATURE_LOYALTY === "1",
  giftCards: process.env.FEATURE_GIFT_CARDS === "1",
  salonMiniSites: process.env.FEATURE_SALON_MINI_SITES === "1",
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
