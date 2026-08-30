"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMembership, setActiveOrganizationId } from "@/lib/org-context";
import { requireUser } from "@/lib/require-user";

export async function switchOrganization(formData: FormData) {
  const session = await requireUser();
  const organizationId = String(formData.get("organizationId") ?? "");

  if (!organizationId) {
    redirect("/dashboard");
  }

  const membership = await getMembership(session.user.id, organizationId);
  if (!membership) {
    redirect("/dashboard");
  }

  await setActiveOrganizationId(organizationId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
