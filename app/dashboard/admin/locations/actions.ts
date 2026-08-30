"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import { parseBooleanCheckbox } from "@/lib/catalog";
import { createLocation, setDefaultLocation, updateLocation } from "@/lib/locations";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  createLocationSchema,
  formatZodError,
  updateLocationSchema,
} from "@/lib/validations/location";

function revalidateLocationPaths() {
  revalidatePath("/dashboard/admin/locations");
  revalidatePath("/dashboard/book");
  revalidatePath("/dashboard/staff");
  revalidatePath("/marketplace");
  revalidatePath("/search");
}

export async function createLocationAction(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId } = await requireActiveOrgAdmin();

  const parsed = createLocationSchema.safeParse({
    name: formData.get("name"),
    address: String(formData.get("address") ?? "").trim() || undefined,
    area: String(formData.get("area") ?? "").trim() || null,
    timezone: formData.get("timezone") || "Asia/Manila",
    isDefault: parseBooleanCheckbox(formData.get("isDefault")),
  });

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  try {
    await createLocation(organizationId, parsed.data);
  } catch (error) {
    return actionError(error);
  }

  revalidateLocationPaths();
  redirect("/dashboard/admin/locations");
}

export async function updateLocationAction(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId } = await requireActiveOrgAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Location id is required." };
  }

  const parsed = updateLocationSchema.safeParse({
    name: formData.get("name"),
    address: String(formData.get("address") ?? "").trim() || undefined,
    area: String(formData.get("area") ?? "").trim() || null,
    timezone: formData.get("timezone") || "Asia/Manila",
    active: parseBooleanCheckbox(formData.get("active")),
    isDefault: parseBooleanCheckbox(formData.get("isDefault")),
  });

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  try {
    await updateLocation(organizationId, id, parsed.data);
  } catch (error) {
    return actionError(error);
  }

  revalidateLocationPaths();
  redirect("/dashboard/admin/locations");
}

export async function makeDefaultLocation(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId } = await requireActiveOrgAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Location id is required." };
  }

  try {
    await setDefaultLocation(organizationId, id);
  } catch (error) {
    return actionError(error);
  }

  revalidateLocationPaths();
  redirect("/dashboard/admin/locations");
}
