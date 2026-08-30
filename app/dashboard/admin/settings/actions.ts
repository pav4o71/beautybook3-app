"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import { CoverImageError, parseCoverImageUrl, saveOrganizationCover } from "@/lib/org-cover";
import { prisma } from "@/lib/prisma";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  formatZodError,
  organizationSettingsSchema,
} from "@/lib/validations/organization";

function revalidateSettingsPaths(slug: string) {
  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/");
  revalidatePath("/marketplace");
  revalidatePath("/search");
  revalidatePath(`/s/${slug}`);
  revalidatePath(`/s/${slug}/book`);
}

export async function updateOrganizationSettings(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId, organization } = await requireActiveOrgAdmin();

  const parsed = organizationSettingsSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    published: formData.get("published") === "on",
  });

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const uploaded = formData.get("coverImage");
  let coverImageUrl: string | null;
  try {
    if (uploaded instanceof File && uploaded.size > 0) {
      coverImageUrl = await saveOrganizationCover(organizationId, uploaded);
    } else {
      coverImageUrl = parseCoverImageUrl(String(formData.get("coverImageUrl") ?? ""));
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
        name: parsed.data.name,
        timezone: parsed.data.timezone,
        published: parsed.data.published,
        coverImageUrl,
      },
    });

    await prisma.location.updateMany({
      where: { organizationId, isDefault: true },
      data: { timezone: parsed.data.timezone },
    });
  } catch (error) {
    return actionError(error);
  }

  revalidateSettingsPaths(organization.slug);
  redirect("/dashboard/admin/settings?saved=1");
}
