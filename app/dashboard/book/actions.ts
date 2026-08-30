"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionFormState } from "@/lib/action-form-state";
import { actionError } from "@/lib/action-form-state";
import { createAppointment } from "@/lib/booking";
import { requireActiveOrgContext } from "@/lib/require-org";
import {
  bookSlotSchema,
  formatZodError,
} from "@/lib/validations/booking";

/** Called from client slot forms — returns errors inline; redirects on success. */
export async function bookSlot(formData: FormData): Promise<ActionFormState> {
  const { session, organizationId, locationId } = await requireActiveOrgContext();

  const parsed = bookSlotSchema.safeParse({
    organizationId,
    locationId,
    customerId: session.user.id,
    serviceId: formData.get("serviceId"),
    staffId: formData.get("staffId"),
    startsAt: formData.get("startsAt"),
  });

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  try {
    await createAppointment({
      organizationId: parsed.data.organizationId,
      locationId: parsed.data.locationId,
      customerId: parsed.data.customerId ?? session.user.id,
      serviceId: parsed.data.serviceId,
      staffId: parsed.data.staffId,
      startsAt: parsed.data.startsAt,
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/dashboard/book");
  revalidatePath("/dashboard/appointments");
  redirect("/dashboard/appointments?booked=1");
}
