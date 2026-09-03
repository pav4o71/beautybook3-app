import type { ListingTier } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { mapOrganizationListingProfile } from "@/lib/listing";
import { photosToUrls, type ListingPhotoRecord } from "@/lib/listing-gallery";
import { parseStorefrontLayout } from "@/lib/listing-layout";
import { parseListingTheme, resolveListingTheme } from "@/lib/listing-theme";
import type { z } from "zod";
import { listingPresetsSchema } from "@/lib/validations/listing-editor";

export type ListingPreset = z.infer<typeof listingPresetsSchema>[number];

export type ListingEditorState = {
  organizationId: string;
  slug: string;
  name: string;
  listingTier: ListingTier;
  photoLimit: number;
  coverImageUrl: string | null;
  tagline: string | null;
  highlights: string[];
  featuredServiceId: string | null;
  accentColor: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  websiteUrl: string | null;
  theme: ReturnType<typeof resolveListingTheme>;
  layout: ReturnType<typeof parseStorefrontLayout>;
  presets: ListingPreset[];
  photos: ListingPhotoRecord[];
  primaryLocation: {
    city: string | null;
    area: string | null;
  } | null;
  featuredService: {
    id: string;
    name: string;
    priceCents: number;
    categoryName: string;
  } | null;
  logoUrl: string | null;
};

export async function getListingEditorState(organizationId: string): Promise<ListingEditorState | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      featuredService: {
        where: { active: true },
        include: { category: true },
      },
      locations: {
        where: { active: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        take: 1,
      },
    },
  });

  if (!org) return null;

  const listing = mapOrganizationListingProfile(org, org.featuredService);
  const primaryLocation = org.locations[0] ?? null;

  let presets: ListingPreset[] = [];
  try {
    presets = listingPresetsSchema.parse(org.listingPresets);
  } catch {
    presets = [];
  }

  return {
    organizationId: org.id,
    slug: org.slug,
    name: org.name,
    listingTier: org.listingTier,
    photoLimit: org.photoLimit,
    coverImageUrl: org.coverImageUrl,
    tagline: org.tagline,
    highlights: org.highlights,
    featuredServiceId: org.featuredServiceId,
    accentColor: org.accentColor,
    instagramUrl: org.instagramUrl,
    facebookUrl: org.facebookUrl,
    websiteUrl: org.websiteUrl,
    theme: resolveListingTheme(org.listingTheme, org.accentColor, org.listingTier),
    layout: parseStorefrontLayout(org.storefrontLayout),
    presets,
    photos: org.photos.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      sortOrder: p.sortOrder,
    })),
    primaryLocation: primaryLocation
      ? { city: primaryLocation.city, area: primaryLocation.area }
      : null,
    featuredService: listing.featuredService,
    logoUrl: org.logoUrl,
  };
}

export function editorStateToGalleryUrls(photos: ListingPhotoRecord[]): string[] {
  return photosToUrls(photos);
}

export function draftThemeFromState(state: ListingEditorState) {
  return parseListingTheme(state.theme);
}
