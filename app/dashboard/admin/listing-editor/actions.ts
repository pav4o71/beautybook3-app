"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import { isPremiumListing } from "@/lib/listing";
import {
  canUploadMorePhotos,
  effectivePhotoLimit,
  photosToUrls,
} from "@/lib/listing-gallery";
import { DEFAULT_LISTING_THEME } from "@/lib/listing-theme";
import {
  CoverImageError,
  saveOrganizationGalleryImage,
} from "@/lib/org-cover";
import { prisma } from "@/lib/prisma";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  listingEditorDraftSchema,
  listingPresetsSchema,
  parseListingEditorForm,
} from "@/lib/validations/listing-editor";

function revalidateListingPaths(slug: string) {
  revalidatePath("/dashboard/admin/listing-editor");
  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/");
  revalidatePath("/marketplace");
  revalidatePath("/search");
  revalidatePath(`/s/${slug}`);
  revalidatePath(`/s/${slug}/book`);
}

async function syncCoverAndGallery(organizationId: string) {
  const photos = await prisma.listingPhoto.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
  });
  const urls = photosToUrls(photos);
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      coverImageUrl: urls[0] ?? null,
      galleryUrls: urls.slice(1),
    },
  });
}

export async function saveListingCustomizationAction(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId, organization } = await requireActiveOrgAdmin();
  const parsed = parseListingEditorForm(formData);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const data = parsed.data;
  const premium = isPremiumListing(organization.listingTier);

  if (data.featuredServiceId) {
    const service = await prisma.service.findFirst({
      where: { id: data.featuredServiceId, organizationId, active: true },
    });
    if (!service) {
      return { error: "Featured service must belong to your salon." };
    }
  }

  const theme = premium ? data.theme : DEFAULT_LISTING_THEME;
  const layout = premium ? data.layout : [];
  const accentColor = premium ? data.theme.accentColor : null;

  try {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        tagline: data.tagline,
        highlights: data.highlights,
        featuredServiceId: data.featuredServiceId,
        listingTheme: theme,
        storefrontLayout: layout,
        accentColor,
        ...(premium
          ? {}
          : {
              instagramUrl: null,
              facebookUrl: null,
              websiteUrl: null,
            }),
      },
    });
  } catch (error) {
    return actionError(error);
  }

  revalidateListingPaths(organization.slug);
  redirect("/dashboard/admin/listing-editor?saved=1");
}

export async function uploadListingPhotoAction(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId, organization } = await requireActiveOrgAdmin();

  if (!isPremiumListing(organization.listingTier)) {
    return { error: "Photo gallery requires a Premium listing." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  const currentCount = await prisma.listingPhoto.count({ where: { organizationId } });
  if (!canUploadMorePhotos(organization.listingTier, organization.photoLimit, currentCount)) {
    return {
      error: `Photo limit reached (${effectivePhotoLimit(organization.listingTier, organization.photoLimit)}).`,
    };
  }

  let url: string;
  try {
    url = await saveOrganizationGalleryImage(organizationId, file);
  } catch (error) {
    if (error instanceof CoverImageError) {
      return { error: error.message };
    }
    return actionError(error);
  }

  const maxOrder = await prisma.listingPhoto.aggregate({
    where: { organizationId },
    _max: { sortOrder: true },
  });

  try {
    await prisma.listingPhoto.create({
      data: {
        organizationId,
        url,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    await syncCoverAndGallery(organizationId);
  } catch (error) {
    return actionError(error);
  }

  revalidateListingPaths(organization.slug);
  return {};
}

export async function reorderListingPhotosAction(photoIds: string[]): Promise<ActionFormState> {
  const { organizationId, organization } = await requireActiveOrgAdmin();

  if (!isPremiumListing(organization.listingTier)) {
    return { error: "Photo reordering requires a Premium listing." };
  }

  const photos = await prisma.listingPhoto.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const validIds = new Set(photos.map((p) => p.id));
  if (photoIds.length !== photos.length || photoIds.some((id) => !validIds.has(id))) {
    return { error: "Invalid photo order." };
  }

  try {
    await prisma.$transaction(
      photoIds.map((id, index) =>
        prisma.listingPhoto.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    await syncCoverAndGallery(organizationId);
  } catch (error) {
    return actionError(error);
  }

  revalidateListingPaths(organization.slug);
  return {};
}

export async function updatePhotoCaptionAction(
  photoId: string,
  caption: string,
): Promise<ActionFormState> {
  const { organizationId, organization } = await requireActiveOrgAdmin();

  const photo = await prisma.listingPhoto.findFirst({
    where: { id: photoId, organizationId },
  });
  if (!photo) {
    return { error: "Photo not found." };
  }

  const trimmed = caption.trim().slice(0, 120);

  try {
    await prisma.listingPhoto.update({
      where: { id: photoId },
      data: { caption: trimmed.length > 0 ? trimmed : null },
    });
  } catch (error) {
    return actionError(error);
  }

  revalidateListingPaths(organization.slug);
  return {};
}

export async function deleteListingPhotoAction(photoId: string): Promise<ActionFormState> {
  const { organizationId, organization } = await requireActiveOrgAdmin();

  const photo = await prisma.listingPhoto.findFirst({
    where: { id: photoId, organizationId },
  });
  if (!photo) {
    return { error: "Photo not found." };
  }

  try {
    if (photo.url.startsWith(`/uploads/orgs/${organizationId}/`)) {
      const filePath = path.join(process.cwd(), "public", photo.url);
      await unlink(filePath).catch(() => undefined);
    }
    await prisma.listingPhoto.delete({ where: { id: photoId } });
    await syncCoverAndGallery(organizationId);
  } catch (error) {
    return actionError(error);
  }

  revalidateListingPaths(organization.slug);
  return {};
}

export async function saveListingPresetAction(name: string): Promise<ActionFormState> {
  const { organizationId, organization } = await requireActiveOrgAdmin();

  if (!isPremiumListing(organization.listingTier)) {
    return { error: "Presets require a Premium listing." };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Preset name is required." };
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    return { error: "Organization not found." };
  }

  const draftParsed = listingEditorDraftSchema.safeParse({
    theme: org.listingTheme,
    layout: org.storefrontLayout,
    tagline: org.tagline ?? "",
    highlights: org.highlights,
    featuredServiceId: org.featuredServiceId ?? "",
  });
  if (!draftParsed.success) {
    return { error: "Current listing settings are invalid." };
  }

  let presets: import("@/lib/listing-editor").ListingPreset[] = [];
  try {
    presets = listingPresetsSchema.parse(org.listingPresets);
  } catch {
    presets = [];
  }

  if (presets.length >= 5) {
    return { error: "You can save up to 5 presets." };
  }

  const preset = {
    id: crypto.randomUUID(),
    name: trimmed,
    theme: draftParsed.data.theme,
    layout: draftParsed.data.layout,
    savedAt: new Date().toISOString(),
  };

  try {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { listingPresets: [...presets, preset] },
    });
  } catch (error) {
    return actionError(error);
  }

  revalidateListingPaths(organization.slug);
  return {};
}

export async function setPhotoLimitAction(limit: number): Promise<ActionFormState> {
  const { organizationId, organization } = await requireActiveOrgAdmin();

  if (!isPremiumListing(organization.listingTier)) {
    return { error: "Photo limit extension requires Premium." };
  }

  const capped = Math.min(Math.max(limit, 6), 20);

  try {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { photoLimit: capped },
    });
  } catch (error) {
    return actionError(error);
  }

  revalidateListingPaths(organization.slug);
  return {};
}
