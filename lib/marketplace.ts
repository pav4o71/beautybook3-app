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
    area: string | null;
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

export type MarketplaceServiceResult = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  categorySlug: string;
  categoryName: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  locations: {
    id: string;
    name: string;
    address: string | null;
    area: string | null;
    isDefault: boolean;
  }[];
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

export async function listMarketplaceServices(input: {
  categorySlug?: string;
  area?: string;
} = {}): Promise<MarketplaceServiceResult[]> {
  const area = input.area?.trim() || undefined;
  const categorySlug = input.categorySlug?.trim() || undefined;

  const services = await prisma.service.findMany({
    where: {
      active: true,
      organization: {
        published: true,
        ...(area
          ? {
              locations: {
                some: { active: true, area },
              },
            }
          : {}),
      },
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    include: {
      category: { select: { slug: true, name: true } },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          published: true,
          locations: {
            where: {
              active: true,
              ...(area ? { area } : {}),
            },
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              address: true,
              area: true,
              isDefault: true,
            },
          },
        },
      },
    },
    orderBy: [{ priceCents: "asc" }, { name: "asc" }],
  });

  return services
    .filter((service) => service.organization.published && service.organization.locations.length > 0)
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMin: service.durationMin,
      priceCents: service.priceCents,
      categorySlug: service.category.slug,
      categoryName: service.category.name,
      organization: {
        id: service.organization.id,
        name: service.organization.name,
        slug: service.organization.slug,
      },
      locations: service.organization.locations,
    }));
}
