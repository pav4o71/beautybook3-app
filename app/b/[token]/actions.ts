"use server";

import {
  cancelAppointmentByManagementToken,
  rescheduleAppointmentByManagementToken,
} from "@/lib/appointment-management-token";
import {
  sendCustomerCancellationNotification,
  sendCustomerRescheduleNotification,
} from "@/lib/email/notification-service";
import {
  checkRateLimit,
  deriveManagementTokenSubjectHash,
  RATE_LIMIT_CONFIG,
  RATE_LIMIT_ERROR_MESSAGE,
} from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

export async function cancelAppointmentAction(
  token: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const subjectHash = deriveManagementTokenSubjectHash(token);
    const rateLimit = await checkRateLimit({
      scope: RATE_LIMIT_CONFIG.CUSTOMER_CANCEL.scope,
      subjectHash,
      max: RATE_LIMIT_CONFIG.CUSTOMER_CANCEL.max,
      windowMs: RATE_LIMIT_CONFIG.CUSTOMER_CANCEL.windowMs,
    });
    if (!rateLimit.allowed) {
      return { success: false, error: RATE_LIMIT_ERROR_MESSAGE };
    }

    const reason = formData.get("reason") as string | null;
    const note = formData.get("note") as string | null;

    const result = await cancelAppointmentByManagementToken({
      rawToken: token,
      reason,
      note,
    });

    // Post-commit notification dispatch (non-blocking)
    if (result.success && !result.alreadyCancelled) {
      try {
        await sendCustomerCancellationNotification({
          appointmentId: result.appointmentId,
          rawToken: token,
        });
      } catch {
        // Non-blocking
      }
    }

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

    const subjectHash = deriveManagementTokenSubjectHash(token);
    const rateLimit = await checkRateLimit({
      scope: RATE_LIMIT_CONFIG.CUSTOMER_RESCHEDULE.scope,
      subjectHash,
      max: RATE_LIMIT_CONFIG.CUSTOMER_RESCHEDULE.max,
      windowMs: RATE_LIMIT_CONFIG.CUSTOMER_RESCHEDULE.windowMs,
    });
    if (!rateLimit.allowed) {
      return { success: false, error: RATE_LIMIT_ERROR_MESSAGE };
    }

    const result = await rescheduleAppointmentByManagementToken({
      rawToken: token,
      targetStartsAt,
    });

    // Post-commit notification dispatch (non-blocking)
    if (result.success) {
      try {
        await sendCustomerRescheduleNotification({
          appointmentId: result.appointment.id,
          rawToken: token,
          previousStartsAt: result.previousStartsAt,
        });
      } catch {
        // Non-blocking
      }
    }

    revalidatePath(`/b/${token}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reschedule appointment.",
    };
  }
}
