"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearActiveLocationId,
  getMembership,
  setActiveLocationId,
  setActiveOrganizationId,
} from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
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
  await clearActiveLocationId();
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function switchLocation(formData: FormData) {
  const session = await requireUser();
  const locationId = String(formData.get("locationId") ?? "");

  if (!locationId) {
    redirect("/dashboard");
  }

  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      active: true,
      organization: {
        members: { some: { userId: session.user.id } },
      },
    },
  });

  if (!location) {
    redirect("/dashboard");
  }

  await setActiveOrganizationId(location.organizationId);
  await setActiveLocationId(location.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/book");
  redirect("/dashboard/book");
}
