"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import {
  parseAdminSettableStatus,
  updateAppointmentStatus,
} from "@/lib/appointments";
import { createAppointment } from "@/lib/booking";
import {
  sendAdminCancellationNotification,
  sendBookingConfirmationNotification,
} from "@/lib/email/notification-service";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  formatZodError,
  parseServiceIdsFromForm,
  walkInBookingSchema,
} from "@/lib/validations/booking";

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

    if (status === "CANCELLED") {
      try {
        await sendAdminCancellationNotification({ appointmentId: id });
      } catch {
        // Non-blocking
      }
    }
  } catch (error) {
    return actionError(error);
  }

  revalidateAppointmentPaths();
  redirect("/dashboard/admin/appointments");
}

export async function createWalkInAppointmentAction(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId, locationId: activeLocationId } = await requireActiveOrgAdmin();

  const formLocationId = String(formData.get("locationId") ?? "");
  const locationId = formLocationId || activeLocationId;

  const parsed = walkInBookingSchema.safeParse({
    locationId,
    staffId: formData.get("staffId"),
    serviceIds: parseServiceIdsFromForm(formData),
    startsAt: formData.get("startsAt"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerEmail: formData.get("customerEmail"),
  });

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  let created: { id: string; rawToken: string };
  try {
    created = await createAppointment({
      organizationId,
      locationId: parsed.data.locationId,
      customerId: null,
      staffId: parsed.data.staffId,
      serviceIds: parsed.data.serviceIds,
      startsAt: parsed.data.startsAt,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone ?? null,
      customerEmail: parsed.data.customerEmail ?? null,
      isWalkIn: true,
    });
  } catch (error) {
    return actionError(error);
  }

  if (parsed.data.customerEmail) {
    try {
      await sendBookingConfirmationNotification({
        appointmentId: created.id,
        rawToken: created.rawToken,
      });
    } catch {
      // Non-blocking
    }
  }

  revalidateAppointmentPaths();
  return {};
}
