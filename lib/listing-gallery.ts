import type { ListingTier } from "@/app/generated/prisma/enums";
import { isPremiumListing } from "@/lib/listing";

export type ListingPhotoRecord = {
  id: string;
  url: string;
  caption: string | null;
  sortOrder: number;
};

export const STANDARD_PHOTO_LIMIT = 1;
export const PREMIUM_PHOTO_LIMIT = 6;
export const MAX_PHOTO_LIMIT = 20;

export function defaultPhotoLimit(tier: ListingTier): number {
  return isPremiumListing(tier) ? PREMIUM_PHOTO_LIMIT : STANDARD_PHOTO_LIMIT;
}

export function effectivePhotoLimit(tier: ListingTier, photoLimit: number): number {
  const tierDefault = defaultPhotoLimit(tier);
  const capped = Math.min(Math.max(photoLimit, tierDefault), MAX_PHOTO_LIMIT);
  return isPremiumListing(tier) ? capped : STANDARD_PHOTO_LIMIT;
}

export function canUploadMorePhotos(
  tier: ListingTier,
  photoLimit: number,
  currentCount: number,
): boolean {
  return currentCount < effectivePhotoLimit(tier, photoLimit);
}

export function photosToUrls(photos: ListingPhotoRecord[]): string[] {
  return [...photos].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => p.url);
}

export function primaryPhotoUrl(photos: ListingPhotoRecord[], coverImageUrl: string | null): string | null {
  const sorted = [...photos].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted[0]?.url ?? coverImageUrl;
}
