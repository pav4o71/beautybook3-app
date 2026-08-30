"use server";

import { OrgRole } from "@/app/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import { setActiveOrganizationId } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { uniqueOrganizationSlug } from "@/lib/tenant";
import {
  formatZodError,
  onboardingSchema,
} from "@/lib/validations/organization";

export async function createOrganization(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const session = await requireUser();

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone") || "Asia/Manila",
  });

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  try {
    const slug = await uniqueOrganizationSlug(parsed.data.name);
    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: parsed.data.name,
          slug,
          timezone: parsed.data.timezone,
          published: false,
        },
      });

      await tx.location.create({
        data: {
          organizationId: org.id,
          name: "Main location",
          isDefault: true,
          timezone: parsed.data.timezone,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: session.user.id,
          role: OrgRole.OWNER,
        },
      });

      return org;
    });

    await setActiveOrganizationId(organization.id);
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/marketplace");
  revalidatePath("/search");
  redirect("/dashboard/admin");
}
