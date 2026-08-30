import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const ACTIVE_ORG_COOKIE = "activeOrganizationId";
export const ACTIVE_LOCATION_COOKIE = "activeLocationId";

export async function getActiveOrganizationId() {
  const store = await cookies();
  return store.get(ACTIVE_ORG_COOKIE)?.value ?? null;
}

export async function getActiveLocationId() {
  const store = await cookies();
  return store.get(ACTIVE_LOCATION_COOKIE)?.value ?? null;
}

export async function setActiveOrganizationId(organizationId: string) {
  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function setActiveLocationId(locationId: string) {
  const store = await cookies();
  store.set(ACTIVE_LOCATION_COOKIE, locationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearActiveLocationId() {
  const store = await cookies();
  store.delete(ACTIVE_LOCATION_COOKIE);
}

export async function listUserMemberships(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          locations: {
            where: { active: true },
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

function resolveLocationForOrg(
  locations: { id: string; isDefault: boolean }[],
  preferredLocationId: string | null,
) {
  if (preferredLocationId) {
    const match = locations.find((location) => location.id === preferredLocationId);
    if (match) {
      return match;
    }
  }

  return (
    locations.find((location) => location.isDefault) ??
    locations[0] ??
    null
  );
}

export async function resolveActiveOrganization(userId: string) {
  const cookieOrgId = await getActiveOrganizationId();
  const cookieLocationId = await getActiveLocationId();
  const memberships = await listUserMemberships(userId);

  if (memberships.length === 0) {
    return null;
  }

  const membership =
    (cookieOrgId
      ? memberships.find((row) => row.organizationId === cookieOrgId)
      : null) ?? memberships[0];

  const location = resolveLocationForOrg(
    membership.organization.locations,
    cookieLocationId,
  );

  return {
    organization: membership.organization,
    membership,
    location,
    locations: membership.organization.locations,
  };
}

export async function getMembership(userId: string, organizationId: string) {
  return prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    include: { organization: true },
  });
}
