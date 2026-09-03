"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import { isPremiumListing } from "@/lib/listing";
import {
  CoverImageError,
  parseOrgImageUrl,
  saveOrganizationLogo,
} from "@/lib/org-cover";
import { prisma } from "@/lib/prisma";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import { formatZodError } from "@/lib/validations/organization";
import { parseListingProfileForm } from "@/lib/validations/listing";

function revalidateListingPaths(slug: string) {
  revalidatePath("/dashboard/admin/listing-editor");
  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/");
  revalidatePath("/marketplace");
  revalidatePath("/search");
  revalidatePath(`/s/${slug}`);
  revalidatePath(`/s/${slug}/book`);
}

export async function updateListingProfileAction(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId, organization } = await requireActiveOrgAdmin();

  const parsed = parseListingProfileForm(formData);
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const data = parsed.data;

  if (data.featuredServiceId) {
    const service = await prisma.service.findFirst({
      where: {
        id: data.featuredServiceId,
        organizationId,
        active: true,
      },
    });
    if (!service) {
      return { error: "Featured service must belong to your salon." };
    }
  }

  const uploaded = formData.get("logoImage");
  let logoUrl: string | null;
  try {
    if (uploaded instanceof File && uploaded.size > 0) {
      logoUrl = await saveOrganizationLogo(organizationId, uploaded);
    } else {
      logoUrl = parseOrgImageUrl(String(formData.get("logoUrl") ?? ""), organizationId);
    }
  } catch (error) {
    if (error instanceof CoverImageError) {
      return { error: error.message };
    }
    return actionError(error);
  }

  try {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        tagline: data.tagline,
        highlights: data.highlights,
        featuredServiceId: data.featuredServiceId,
        logoUrl,
        ...(isPremiumListing(organization.listingTier)
          ? {
              accentColor: data.accentColor,
              instagramUrl: data.instagramUrl,
              facebookUrl: data.facebookUrl,
              websiteUrl: data.websiteUrl,
            }
          : {
              accentColor: null,
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
  redirect("/dashboard/admin/settings?listingSaved=1");
}
