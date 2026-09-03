import type { ListingTier } from "@/app/generated/prisma/enums";

export type ListingFeaturedService = {
  id: string;
  name: string;
  priceCents: number;
  categoryName: string;
};

export type PublicListingProfile = {
  listingTier: ListingTier;
  tagline: string | null;
  logoUrl: string | null;
  accentColor: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  websiteUrl: string | null;
  galleryUrls: string[];
  highlights: string[];
  featuredService: ListingFeaturedService | null;
  listingTheme: unknown;
  storefrontLayout: unknown;
};

type OrganizationListingRow = {
  listingTier: ListingTier;
  tagline: string | null;
  logoUrl: string | null;
  accentColor: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  websiteUrl: string | null;
  galleryUrls: unknown;
  highlights: string[];
  featuredServiceId: string | null;
  listingTheme?: unknown;
  storefrontLayout?: unknown;
  featuredService?: {
    id: string;
    name: string;
    priceCents: number;
    category: { name: string };
  } | null;
};

type FallbackFeaturedService = {
  id: string;
  name: string;
  priceCents: number;
  category: { name: string };
};

export function parseGalleryUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function isPremiumListing(tier: ListingTier) {
  return tier === "PREMIUM";
}

export function cardHighlightLimit(tier: ListingTier) {
  return isPremiumListing(tier) ? 3 : 2;
}

export function cardHighlights(highlights: string[], tier: ListingTier) {
  return highlights.slice(0, cardHighlightLimit(tier));
}

export function resolveFeaturedService(
  org: OrganizationListingRow,
  fallback?: FallbackFeaturedService | null,
): ListingFeaturedService | null {
  if (org.featuredService) {
    return {
      id: org.featuredService.id,
      name: org.featuredService.name,
      priceCents: org.featuredService.priceCents,
      categoryName: org.featuredService.category.name,
    };
  }
  if (fallback) {
    return {
      id: fallback.id,
      name: fallback.name,
      priceCents: fallback.priceCents,
      categoryName: fallback.category.name,
    };
  }
  return null;
}

export function mapOrganizationListingProfile(
  org: OrganizationListingRow,
  fallbackFeatured?: FallbackFeaturedService | null,
): PublicListingProfile {
  return {
    listingTier: org.listingTier,
    tagline: org.tagline,
    logoUrl: org.logoUrl,
    accentColor: org.accentColor,
    instagramUrl: org.instagramUrl,
    facebookUrl: org.facebookUrl,
    websiteUrl: org.websiteUrl,
    galleryUrls: parseGalleryUrls(org.galleryUrls),
    highlights: org.highlights,
    featuredService: resolveFeaturedService(org, fallbackFeatured),
    listingTheme: org.listingTheme ?? {},
    storefrontLayout: org.storefrontLayout ?? [],
  };
}

export function accentBorderStyle(accentColor: string | null, tier: ListingTier) {
  if (!isPremiumListing(tier) || !accentColor) {
    return undefined;
  }
  return { borderColor: accentColor };
}
