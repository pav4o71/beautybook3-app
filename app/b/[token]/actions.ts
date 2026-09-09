"use server";

import {
  cancelAppointmentByManagementToken,
  rescheduleAppointmentByManagementToken,
} from "@/lib/appointment-management-token";
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

export async function rescheduleAppointmentAction(
  token: string,
  targetStartsAt: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!targetStartsAt || typeof targetStartsAt !== "string") {
      return { success: false, error: "Please select a valid time." };
    }

    await rescheduleAppointmentByManagementToken({
      rawToken: token,
      targetStartsAt,
    });

    revalidatePath(`/b/${token}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reschedule appointment.",
    };
  }
}
