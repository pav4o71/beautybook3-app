import { redirect } from "next/navigation";
import type { OrgRole } from "@/app/generated/prisma/enums";
import { getMembership } from "@/lib/org-context";
import { isOrgAdminRole, orgRoleAtLeast } from "@/lib/org-roles";
import { requireUser } from "@/lib/require-user";

export async function requireOrgMember(organizationId: string, minimumRole?: OrgRole) {
  const session = await requireUser();
  const membership = await getMembership(session.user.id, organizationId);

  if (!membership) {
    redirect("/dashboard");
  }

  if (minimumRole && !orgRoleAtLeast(membership.role, minimumRole)) {
    redirect("/dashboard");
  }

  return { session, membership };
}

export async function requireOrgAdmin(organizationId: string) {
  return requireOrgMember(organizationId, "ADMIN");
}

export async function requireActiveOrgAdmin() {
  const session = await requireUser();
  const { resolveActiveOrganization } = await import("@/lib/org-context");
  const active = await resolveActiveOrganization(session.user.id);

  if (!active) {
    redirect("/onboarding");
  }

  const isLegacyAdmin = session.user.role === "ADMIN";
  const isOrgAdmin = isOrgAdminRole(active.membership.role);

  if (!isLegacyAdmin && !isOrgAdmin) {
    redirect("/dashboard");
  }

  if (!active.location) {
    throw new Error("Active organization has no active location.");
  }

  return {
    session,
    organization: active.organization,
    membership: active.membership,
    location: active.location,
    locations: active.locations,
    organizationId: active.organization.id,
    locationId: active.location.id,
  };
}

export async function requireActiveOrgContext() {
  const session = await requireUser();
  const { resolveActiveOrganization } = await import("@/lib/org-context");
  const active = await resolveActiveOrganization(session.user.id);

  if (!active) {
    redirect("/onboarding");
  }

  if (!active.location) {
    throw new Error("Active organization has no active location.");
  }

  return {
    session,
    organization: active.organization,
    membership: active.membership,
    location: active.location,
    locations: active.locations,
    organizationId: active.organization.id,
    locationId: active.location.id,
  };
}
