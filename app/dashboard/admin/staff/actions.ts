"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import {
  parseBooleanCheckbox,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/catalog";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

function revalidateStaffPaths() {
  revalidatePath("/dashboard/admin/staff");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/book");
}

function parseServiceIds(formData: FormData) {
  return formData
    .getAll("serviceIds")
    .map((value) => String(value))
    .filter(Boolean);
}

async function syncStaffServices(staffId: string, serviceIds: string[]) {
  const uniqueIds = [...new Set(serviceIds)];

  if (uniqueIds.length > 0) {
    const count = await prisma.service.count({
      where: { id: { in: uniqueIds }, active: true },
    });
    if (count !== uniqueIds.length) {
      throw new Error("One or more selected services are invalid.");
    }
  }

  await prisma.$transaction([
    prisma.staffService.deleteMany({ where: { staffId } }),
    ...(uniqueIds.length > 0
      ? [
          prisma.staffService.createMany({
            data: uniqueIds.map((serviceId) => ({ staffId, serviceId })),
          }),
        ]
      : []),
  ]);
}

export async function createStaff(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  await requireAdmin();

  try {
    const name = parseRequiredString(formData.get("name"), "Name");
    const bio = parseOptionalString(formData.get("bio"));
    const active = parseBooleanCheckbox(formData.get("active"));
    const serviceIds = parseServiceIds(formData);

    const staff = await prisma.staff.create({
      data: { name, bio, active },
    });

    await syncStaffServices(staff.id, serviceIds);
  } catch (error) {
    return actionError(error);
  }

  revalidateStaffPaths();
  redirect("/dashboard/admin/staff");
}

export async function updateStaff(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  await requireAdmin();

  try {
    const id = String(formData.get("id") ?? "");
    if (!id) {
      throw new Error("Staff id is required.");
    }

    const name = parseRequiredString(formData.get("name"), "Name");
    const bio = parseOptionalString(formData.get("bio"));
    const active = parseBooleanCheckbox(formData.get("active"));
    const serviceIds = parseServiceIds(formData);

    await prisma.staff.update({
      where: { id },
      data: { name, bio, active },
    });

    await syncStaffServices(id, serviceIds);
  } catch (error) {
    return actionError(error);
  }

  revalidateStaffPaths();
  redirect("/dashboard/admin/staff");
}

export async function deactivateStaff(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/dashboard/admin/staff");
  }

  await prisma.staff.update({
    where: { id },
    data: { active: false },
  });

  revalidateStaffPaths();
  redirect("/dashboard/admin/staff");
}

export async function activateStaff(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/dashboard/admin/staff");
  }

  await prisma.staff.update({
    where: { id },
    data: { active: true },
  });

  revalidateStaffPaths();
  redirect("/dashboard/admin/staff");
}
