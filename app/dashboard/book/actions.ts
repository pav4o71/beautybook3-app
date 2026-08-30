"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionFormState } from "@/lib/action-form-state";
import { actionError } from "@/lib/action-form-state";
import { createAppointment } from "@/lib/booking";
import { requireUser } from "@/lib/require-user";

/** Called from client slot forms (not `<form action>`) — returns errors inline. */
export async function bookSlot(formData: FormData): Promise<ActionFormState & { ok?: true }> {
  const session = await requireUser();
  const serviceId = String(formData.get("serviceId") ?? "");
  const staffId = String(formData.get("staffId") ?? "");
  const startsAtValue = String(formData.get("startsAt") ?? "");

  if (!serviceId || !staffId || !startsAtValue) {
    return { error: "Choose a service, staff member, and time." };
  }

  const startsAt = new Date(startsAtValue);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Invalid time selected." };
  }

  try {
    await createAppointment({
      customerId: session.user.id,
      serviceId,
      staffId,
      startsAt,
    });
  } catch (error) {
    return actionError(error);
  }

  revalidatePath("/dashboard/book");
  revalidatePath("/dashboard/appointments");
  redirect("/dashboard/appointments?booked=1");
}
