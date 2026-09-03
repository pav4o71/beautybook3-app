import type { ListingTier } from "@/app/generated/prisma/enums";
import { parseGalleryUrls } from "@/lib/listing";
import { prisma } from "@/lib/prisma";
import type { ListingPhotoRecord } from "@/lib/listing-gallery";

export async function syncListingPhotosFromOrganization(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return;

  const urls = [...new Set(
    [org.coverImageUrl, ...parseGalleryUrls(org.galleryUrls)].filter(
      (url): url is string => typeof url === "string" && url.length > 0,
    ),
  )];

  await prisma.$transaction(async (tx) => {
    await tx.listingPhoto.deleteMany({ where: { organizationId } });
    if (urls.length === 0) {
      await tx.organization.update({
        where: { id: organizationId },
        data: { coverImageUrl: null, galleryUrls: [] },
      });
      return;
    }
    await tx.listingPhoto.createMany({
      data: urls.map((url, sortOrder) => ({
        organizationId,
        url,
        sortOrder,
      })),
    });
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        coverImageUrl: urls[0] ?? null,
        galleryUrls: urls.slice(1),
      },
    });
  });
}

export type { ListingPhotoRecord, ListingTier };
