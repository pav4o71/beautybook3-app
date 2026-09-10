"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionFormState } from "@/lib/action-form-state";
import { actionError } from "@/lib/action-form-state";
import { createAppointment } from "@/lib/booking";
import { sendBookingConfirmationNotification } from "@/lib/email/notification-service";
import { prisma } from "@/lib/prisma";
import { requireActiveOrgContext } from "@/lib/require-org";
import {
  bookSlotSchema,
  formatZodError,
  parseServiceIdsFromForm,
} from "@/lib/validations/booking";

/** Called from client slot forms — returns errors inline; redirects on success. */
export async function bookSlot(formData: FormData): Promise<ActionFormState> {
  const { session, organizationId, locationId: activeLocationId } =
    await requireActiveOrgContext();

  const formLocationId = String(formData.get("locationId") ?? "");
  const locationId = formLocationId || activeLocationId;

  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId, active: true },
  });
  if (!location) {
    return { error: "Choose a valid location." };
  }

  const formCustomerName = formData.get("customerName");
  const formCustomerPhone = formData.get("customerPhone");
  const formCustomerEmail = formData.get("customerEmail");

  const parsed = bookSlotSchema.safeParse({
    organizationId,
    locationId,
    customerId: session.user.id,
    serviceIds: parseServiceIdsFromForm(formData),
    staffId: formData.get("staffId"),
    startsAt: formData.get("startsAt"),
    customerName: formCustomerName ? String(formCustomerName) : session.user.name,
    customerPhone: formCustomerPhone ? String(formCustomerPhone) : ("phone" in session.user ? (session.user as { phone?: string | null }).phone ?? null : null),
    customerEmail: formCustomerEmail ? String(formCustomerEmail) : session.user.email,
  });

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  let createdAppointment: { id: string; rawToken: string };
  try {
    createdAppointment = await createAppointment({
      organizationId: parsed.data.organizationId,
      locationId: parsed.data.locationId,
      customerId: parsed.data.customerId ?? session.user.id,
      serviceIds: parsed.data.serviceIds,
      staffId: parsed.data.staffId,
      startsAt: parsed.data.startsAt,
      customerName: parsed.data.customerName ?? session.user.name,
      customerPhone: parsed.data.customerPhone ?? null,
      customerEmail: parsed.data.customerEmail ?? session.user.email,
    });
  } catch (error) {
    return actionError(error);
  }

  // Post-commit transactional email delivery (isolated; never rolls back booking)
  try {
    await sendBookingConfirmationNotification({
      appointmentId: createdAppointment.id,
      rawToken: createdAppointment.rawToken,
    });
  } catch {
    // Non-blocking: email failure never fails or rolls back the appointment
  }

  revalidatePath("/dashboard/book");
  revalidatePath("/dashboard/appointments");
  redirect("/dashboard/appointments?booked=1");
}
