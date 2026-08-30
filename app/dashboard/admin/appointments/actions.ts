"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import {
  parseAdminSettableStatus,
  updateAppointmentStatus,
} from "@/lib/appointments";
import { requireActiveOrgAdmin } from "@/lib/require-org";

function revalidateAppointmentPaths() {
  revalidatePath("/dashboard/admin/appointments");
  revalidatePath("/dashboard/appointments");
}

export async function setAppointmentStatus(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId } = await requireActiveOrgAdmin();

  const id = String(formData.get("id") ?? "");
  const statusRaw = String(formData.get("status") ?? "");

  if (!id) {
    return actionError(new Error("Appointment id is required."));
  }

  try {
    const status = parseAdminSettableStatus(statusRaw);
    await updateAppointmentStatus({ organizationId, appointmentId: id, status });
  } catch (error) {
    return actionError(error);
  }

  revalidateAppointmentPaths();
  redirect("/dashboard/admin/appointments");
}
