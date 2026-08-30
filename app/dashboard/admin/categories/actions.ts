"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import {
  parseRequiredString,
  parseSortOrder,
  uniqueCategorySlug,
} from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { requireActiveOrgAdmin } from "@/lib/require-org";

function revalidateCategoryPaths() {
  revalidatePath("/dashboard/admin/categories");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/book");
  revalidatePath("/marketplace");
  revalidatePath("/search");
}

export async function createCategory(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId } = await requireActiveOrgAdmin();

  try {
    const name = parseRequiredString(formData.get("name"), "Name");
    const sortOrder = parseSortOrder(formData.get("sortOrder"));
    const slug = await uniqueCategorySlug(organizationId, name);

    await prisma.serviceCategory.create({
      data: { organizationId, name, slug, sortOrder },
    });
  } catch (error) {
    return actionError(error);
  }

  revalidateCategoryPaths();
  redirect("/dashboard/admin/categories");
}

export async function updateCategory(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId } = await requireActiveOrgAdmin();

  try {
    const id = String(formData.get("id") ?? "");
    if (!id) {
      throw new Error("Category id is required.");
    }

    const name = parseRequiredString(formData.get("name"), "Name");
    const sortOrder = parseSortOrder(formData.get("sortOrder"));
    const slug = await uniqueCategorySlug(organizationId, name, id);

    const existing = await prisma.serviceCategory.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new Error("Category not found.");
    }

    await prisma.serviceCategory.update({
      where: { id },
      data: { name, slug, sortOrder },
    });
  } catch (error) {
    return actionError(error);
  }

  revalidateCategoryPaths();
  redirect("/dashboard/admin/categories");
}

export async function deleteCategory(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId } = await requireActiveOrgAdmin();

  try {
    const id = String(formData.get("id") ?? "");
    if (!id) {
      throw new Error("Category id is required.");
    }

    const existing = await prisma.serviceCategory.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new Error("Category not found.");
    }

    const serviceCount = await prisma.service.count({ where: { categoryId: id } });
    if (serviceCount > 0) {
      throw new Error("Remove or move services in this category before deleting it.");
    }

    await prisma.serviceCategory.delete({ where: { id } });
  } catch (error) {
    return actionError(error);
  }

  revalidateCategoryPaths();
  redirect("/dashboard/admin/categories");
}
