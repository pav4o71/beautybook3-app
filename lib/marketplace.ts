import { prisma } from "@/lib/prisma";

export type MarketplaceCategoryFilter = {
  slug: string;
  name: string;
  salonCount: number;
};

export type MarketplaceListing = {
  id: string;
  name: string;
  slug: string;
  locations: {
    id: string;
    name: string;
    address: string | null;
    isDefault: boolean;
  }[];
  serviceCount: number;
  featuredService: {
    id: string;
    name: string;
    priceCents: number;
    categoryName: string;
  } | null;
};

export async function listMarketplaceCategoryFilters(): Promise<
  MarketplaceCategoryFilter[]
> {
  const categories = await prisma.serviceCategory.findMany({
    where: {
      organization: { published: true },
      services: { some: { active: true } },
    },
    select: { slug: true, name: true },
    distinct: ["slug"],
    orderBy: { slug: "asc" },
  });

  return Promise.all(
    categories.map(async (category) => ({
      slug: category.slug,
      name: category.name,
      salonCount: await prisma.organization.count({
        where: {
          published: true,
          services: {
            some: {
              active: true,
              category: { slug: category.slug },
            },
          },
        },
      }),
    })),
  );
}

export async function listMarketplaceOrganizations(
  categorySlug?: string,
): Promise<MarketplaceListing[]> {
  const orgs = await prisma.organization.findMany({
    where: {
      published: true,
      ...(categorySlug
        ? {
            services: {
              some: {
                active: true,
                category: { slug: categorySlug },
              },
            },
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      locations: {
        where: { active: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      },
      services: {
        where: {
          active: true,
          ...(categorySlug ? { category: { slug: categorySlug } } : {}),
        },
        include: { category: true },
        orderBy: { priceCents: "asc" },
        take: 1,
      },
      _count: {
        select: {
          services: { where: { active: true } },
        },
      },
    },
  });

  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    locations: org.locations,
    serviceCount: org._count.services,
    featuredService: org.services[0]
      ? {
          id: org.services[0].id,
          name: org.services[0].name,
          priceCents: org.services[0].priceCents,
          categoryName: org.services[0].category.name,
        }
      : null,
  }));
}
