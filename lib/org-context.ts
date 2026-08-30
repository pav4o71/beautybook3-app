import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const ACTIVE_ORG_COOKIE = "activeOrganizationId";

export async function getActiveOrganizationId() {
  const store = await cookies();
  return store.get(ACTIVE_ORG_COOKIE)?.value ?? null;
}

export async function setActiveOrganizationId(organizationId: string) {
  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function listUserMemberships(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          locations: {
            where: { isDefault: true, active: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function resolveActiveOrganization(userId: string) {
  const cookieOrgId = await getActiveOrganizationId();
  const memberships = await listUserMemberships(userId);

  if (memberships.length === 0) {
    return null;
  }

  if (cookieOrgId) {
    const match = memberships.find((row) => row.organizationId === cookieOrgId);
    if (match) {
      return {
        organization: match.organization,
        membership: match,
        location: match.organization.locations[0] ?? null,
      };
    }
  }

  const first = memberships[0];
  return {
    organization: first.organization,
    membership: first,
    location: first.organization.locations[0] ?? null,
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
