"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionFormState } from "@/lib/action-form-state";
import { actionError } from "@/lib/action-form-state";
import { createAppointment } from "@/lib/booking";
import { getSession } from "@/lib/session";
import { getDefaultLocation, getPublishedOrganizationBySlug } from "@/lib/tenant";
import {
  formatZodError,
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

  const location = organization.locations[0] ?? (await getDefaultLocation(organization.id));
  if (!location) {
    return { error: "This salon is not ready for bookings yet." };
  }

  const parsed = publicBookSlotSchema.safeParse({
    serviceId: formData.get("serviceId"),
    staffId: formData.get("staffId"),
    startsAt: formData.get("startsAt"),
  });

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const session = await getSession();

  try {
    await createAppointment({
      organizationId: organization.id,
      locationId: location.id,
      customerId: session?.user?.id ?? null,
      serviceId: parsed.data.serviceId,
      staffId: parsed.data.staffId,
      startsAt: parsed.data.startsAt,
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath(`/s/${orgSlug}/book`);
  if (session?.user) {
    revalidatePath("/dashboard/appointments");
    redirect("/dashboard/appointments?booked=1");
  }

  redirect(`/s/${orgSlug}/book?booked=1`);
}
