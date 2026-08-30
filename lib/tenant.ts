import { prisma } from "@/lib/prisma";
import { DEMO_ORG_SLUG } from "@/lib/demo-constants";

export { DEMO_ORG_SLUG };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidOrgSlug(slug: string) {
  return SLUG_PATTERN.test(slug);
}

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({
    where: { slug },
    include: {
      locations: {
        where: { active: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      },
    },
  });
}

export async function getPublishedOrganizationBySlug(slug: string) {
  const org = await getOrganizationBySlug(slug);
  if (!org?.published) {
    return null;
  }
  return org;
}

export async function getDefaultLocation(organizationId: string) {
  return prisma.location.findFirst({
    where: { organizationId, isDefault: true, active: true },
  });
}

export async function listPublishedOrganizations() {
  return prisma.organization.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
    include: {
      locations: {
        where: { isDefault: true, active: true },
        take: 1,
      },
    },
  });
}

export async function uniqueOrganizationSlug(name: string, excludeId?: string) {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "salon";

  let candidate = base;
  let suffix = 2;

  while (
    await prisma.organization.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function getDemoTenantContext() {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { slug: DEMO_ORG_SLUG },
    include: {
      locations: { where: { isDefault: true, active: true }, take: 1 },
    },
  });
  const location = org.locations[0];
  if (!location) {
    throw new Error("Demo organization has no default location.");
  }
  return { organizationId: org.id, locationId: location.id };
}
