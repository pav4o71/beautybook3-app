"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionFormState } from "@/lib/action-form-state";
import { actionError } from "@/lib/action-form-state";
import { createAppointment } from "@/lib/booking";
import { sendBookingConfirmationNotification } from "@/lib/email/notification-service";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getPublishedOrganizationBySlug } from "@/lib/tenant";
import {
  formatZodError,
  parseServiceIdsFromForm,
  publicBookSlotSchema,
} from "@/lib/validations/booking";

export async function bookPublicSlot(
  orgSlug: string,
  formData: FormData,
): Promise<ActionFormState> {
  const organization = await getPublishedOrganizationBySlug(orgSlug);
  if (!organization) {
    return { error: "Salon not found." };
  }

  const parsed = publicBookSlotSchema.safeParse({
    locationId: formData.get("locationId"),
    serviceIds: parseServiceIdsFromForm(formData),
    staffId: formData.get("staffId"),
    startsAt: formData.get("startsAt"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerEmail: formData.get("customerEmail"),
  });

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const location = await prisma.location.findFirst({
    where: {
      id: parsed.data.locationId,
      organizationId: organization.id,
      active: true,
    },
  });

  if (!location) {
    return { error: "Choose a valid location." };
  }

  const session = await getSession();

  let rawToken: string;
  let appointmentId: string;
  try {
    const created = await createAppointment({
      organizationId: organization.id,
      locationId: location.id,
      customerId: session?.user?.id ?? null,
      serviceIds: parsed.data.serviceIds,
      staffId: parsed.data.staffId,
      startsAt: parsed.data.startsAt,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerEmail: parsed.data.customerEmail,
    });
    rawToken = created.rawToken;
    appointmentId = created.id;
  } catch (error) {
    return actionError(error);
  }

  // Post-commit transactional email delivery (isolated; never rolls back booking)
  try {
    await sendBookingConfirmationNotification({
      appointmentId,
      rawToken,
    });
  } catch {
    // Non-blocking: email failure never fails or rolls back the appointment
  }

  revalidatePath(`/s/${orgSlug}/book`);
  if (session?.user) {
    revalidatePath("/dashboard/appointments");
    redirect("/dashboard/appointments?booked=1");
  }

  redirect(`/b/${rawToken}?booked=1`);
}
