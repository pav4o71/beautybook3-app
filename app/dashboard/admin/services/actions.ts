"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import {
  parseBooleanCheckbox,
  parsePesoToCentavos,
  parseOptionalString,
  parsePositiveInt,
  parseRequiredString,
} from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { requireActiveOrgAdmin } from "@/lib/require-org";

function revalidateServicePaths() {
  revalidatePath("/dashboard/admin/services");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/book");
  revalidatePath("/marketplace");
}

export async function createService(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId } = await requireActiveOrgAdmin();

  try {
    const categoryId = parseRequiredString(formData.get("categoryId"), "Category");
    const name = parseRequiredString(formData.get("name"), "Name");
    const description = parseOptionalString(formData.get("description"));
    const durationMin = parsePositiveInt(formData.get("durationMin"), "Duration");
    const priceCents = parsePesoToCentavos(formData.get("pricePhp"), "Price");
    const active = parseBooleanCheckbox(formData.get("active"));

    const category = await prisma.serviceCategory.findFirst({
      where: { id: categoryId, organizationId },
    });
    if (!category) {
      throw new Error("Category not found.");
    }

    await prisma.service.create({
      data: {
        organizationId,
        categoryId,
        name,
        description,
        durationMin,
        priceCents,
        active,
      },
    });
  } catch (error) {
    return actionError(error);
  }

  revalidateServicePaths();
  redirect("/dashboard/admin/services");
}

export async function updateService(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId } = await requireActiveOrgAdmin();

  try {
    const id = String(formData.get("id") ?? "");
    if (!id) {
      throw new Error("Service id is required.");
    }

    const categoryId = parseRequiredString(formData.get("categoryId"), "Category");
    const name = parseRequiredString(formData.get("name"), "Name");
    const description = parseOptionalString(formData.get("description"));
    const durationMin = parsePositiveInt(formData.get("durationMin"), "Duration");
    const priceCents = parsePesoToCentavos(formData.get("pricePhp"), "Price");
    const active = parseBooleanCheckbox(formData.get("active"));

    const existing = await prisma.service.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new Error("Service not found.");
    }

    await prisma.service.update({
      where: { id },
      data: {
        categoryId,
        name,
        description,
        durationMin,
        priceCents,
        active,
      },
    });
  } catch (error) {
    return actionError(error);
  }

  revalidateServicePaths();
  redirect("/dashboard/admin/services");
}

export async function deactivateService(formData: FormData): Promise<void> {
  const { organizationId } = await requireActiveOrgAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/dashboard/admin/services");
  }

  await prisma.service.updateMany({
    where: { id, organizationId },
    data: { active: false },
  });

  revalidateServicePaths();
  redirect("/dashboard/admin/services");
}

export async function activateService(formData: FormData): Promise<void> {
  const { organizationId } = await requireActiveOrgAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/dashboard/admin/services");
  }

  await prisma.service.updateMany({
    where: { id, organizationId },
    data: { active: true },
  });

  revalidateServicePaths();
  redirect("/dashboard/admin/services");
}
