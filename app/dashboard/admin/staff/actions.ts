"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import {
  parseBooleanCheckbox,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getLocationById } from "@/lib/locations";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  formatZodError,
  updateStaffSchema,
} from "@/lib/validations/staff";

function revalidateStaffPaths() {
  revalidatePath("/dashboard/admin/staff");
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/book");
  revalidatePath("/");
  revalidatePath("/marketplace");
  revalidatePath("/search");
}

function parseServiceIds(formData: FormData) {
  return formData
    .getAll("serviceIds")
    .map((value) => String(value))
    .filter(Boolean);
}

async function syncStaffServices(
  organizationId: string,
  staffId: string,
  serviceIds: string[],
) {
  const uniqueIds = [...new Set(serviceIds)];

  if (uniqueIds.length > 0) {
    const count = await prisma.service.count({
      where: { id: { in: uniqueIds }, organizationId, active: true },
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
  const { organizationId, locationId } = await requireActiveOrgAdmin();

  try {
    const name = parseRequiredString(formData.get("name"), "Name");
    const bio = parseOptionalString(formData.get("bio"));
    const active = parseBooleanCheckbox(formData.get("active"));
    const serviceIds = parseServiceIds(formData);

    const staff = await prisma.staff.create({
      data: { organizationId, locationId, name, bio, active },
    });

    await syncStaffServices(organizationId, staff.id, serviceIds);
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
  const { organizationId } = await requireActiveOrgAdmin();

  try {
    const parsed = updateStaffSchema.safeParse({
      id: String(formData.get("id") ?? ""),
      locationId: String(formData.get("locationId") ?? ""),
      name: String(formData.get("name") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      active: parseBooleanCheckbox(formData.get("active")),
    });
    if (!parsed.success) {
      throw new Error(formatZodError(parsed.error));
    }

    const { id, locationId, name, bio, active } = parsed.data;
    const serviceIds = parseServiceIds(formData);

    const existing = await prisma.staff.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new Error("Staff member not found.");
    }

    const location = await getLocationById(organizationId, locationId);
    if (!location?.active) {
      throw new Error("Selected location is not available.");
    }

    await prisma.staff.update({
      where: { id },
      data: { name, bio, active, locationId },
    });

    await syncStaffServices(organizationId, id, serviceIds);
  } catch (error) {
    return actionError(error);
  }

  revalidateStaffPaths();
  redirect("/dashboard/admin/staff");
}

export async function deactivateStaff(formData: FormData): Promise<void> {
  const { organizationId } = await requireActiveOrgAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/dashboard/admin/staff");
  }

  await prisma.staff.updateMany({
    where: { id, organizationId },
    data: { active: false },
  });

  revalidateStaffPaths();
  redirect("/dashboard/admin/staff");
}

export async function activateStaff(formData: FormData): Promise<void> {
  const { organizationId } = await requireActiveOrgAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/dashboard/admin/staff");
  }

  await prisma.staff.updateMany({
    where: { id, organizationId },
    data: { active: true },
  });

  revalidateStaffPaths();
  redirect("/dashboard/admin/staff");
}
