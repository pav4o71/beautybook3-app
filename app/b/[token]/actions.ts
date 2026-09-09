"use server";

import { cancelAppointmentByManagementToken } from "@/lib/appointment-management-token";
import { revalidatePath } from "next/cache";

export async function cancelAppointmentAction(
  token: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const reason = formData.get("reason") as string | null;
    const note = formData.get("note") as string | null;

    await cancelAppointmentByManagementToken({
      rawToken: token,
      reason,
      note,
    });

    revalidatePath(`/b/${token}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel appointment.",
    };
  }
}
