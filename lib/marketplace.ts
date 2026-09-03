import { attachNextAvailability } from "@/lib/availability/next-slot";
import type { NextAvailability } from "@/lib/availability/types";
import { getAvailableSlotsForDay } from "@/lib/booking";
import { publicLocationWhere } from "@/lib/locations";
import { prisma } from "@/lib/prisma";
import { parseSalonTime, salonMinutesOfDay } from "@/lib/timezone";
import type { SalonTrustSignals } from "@/lib/trust/types";
import { emptyTrustSignals } from "@/lib/trust/types";

export type MarketplaceCategoryFilter = {
  slug: string;
  name: string;
  salonCount: number;
};

export type MarketplaceListing = {
  id: string;
  name: string;
  slug: string;
  coverImageUrl: string | null;
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
  /** Real next slot when computed; null if skipped or errored (omit badge). */
  nextAvailability: NextAvailability | null;
  trust: SalonTrustSignals;
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

export async function listMarketplaceOrganizations(input: {
  categorySlug?: string;
  area?: string;
  serviceName?: string;
  /** When false, skip next-slot computation (default true). */
  includeNextAvailability?: boolean;
} = {}): Promise<MarketplaceListing[]> {
  const area = input.area?.trim() || undefined;
  const categorySlug = input.categorySlug?.trim() || undefined;
  const serviceName = input.serviceName?.trim() || undefined;
  const staffedService = {
    active: true,
    ...(serviceName ? { name: serviceName } : {}),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    staff: {
      some: {
        staff: {
          active: true,
          location: {
            active: true,
            ...(area ? { area } : {}),
          },
        },
      },
    },
  } as const;

  const orgs = await prisma.organization.findMany({
    where: {
      published: true,
      services: { some: staffedService },
    },
    orderBy: { name: "asc" },
    include: {
      locations: {
        where: {
          ...publicLocationWhere,
          ...(area ? { area } : {}),
        },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      },
      services: {
        where: staffedService,
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

  const base = orgs
    .filter((org) => org.locations.length > 0)
    .map((org) => {
      const primaryArea =
        org.locations.find((location) => location.isDefault)?.area ??
        org.locations[0]?.area ??
        null;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        coverImageUrl: org.coverImageUrl,
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
        nextAvailability: null as NextAvailability | null,
        trust: emptyTrustSignals({ primaryArea }),
      };
    });

  if (input.includeNextAvailability === false) {
    return base;
  }

  return attachNextAvailability(base, { serviceName, area });
}

export function listMarketplaceServiceChips(
  services: MarketplaceServiceResult[],
): { name: string }[] {
  const names = [...new Set(services.map((service) => service.name))];
  names.sort((left, right) => left.localeCompare(right));
  return names.map((name) => ({ name }));
}

export async function listMarketplaceServices(input: {
  categorySlug?: string;
  area?: string;
} = {}): Promise<MarketplaceServiceResult[]> {
  const area = input.area?.trim() || undefined;
  const categorySlug = input.categorySlug?.trim() || undefined;
  const staffInArea = {
    staff: {
      active: true,
      location: {
        active: true,
        ...(area ? { area } : {}),
      },
    },
  } as const;

  const services = await prisma.service.findMany({
    where: {
      active: true,
      organization: { published: true },
      staff: { some: staffInArea },
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
        },
      },
      staff: {
        where: staffInArea,
        select: {
          staff: {
            select: {
              location: {
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
      },
    },
    orderBy: [{ priceCents: "asc" }, { name: "asc" }],
  });

  return services
    .filter((service) => service.organization.published)
    .map((service) => {
      const locations = [
        ...new Map(
          service.staff.map((row) => [row.staff.location.id, row.staff.location]),
        ).values(),
      ].sort((left, right) => Number(right.isDefault) - Number(left.isDefault) || left.name.localeCompare(right.name));

      return {
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
        locations,
      };
    })
    .filter((service) => service.locations.length > 0);
}

export type MarketplaceAvailabilityResult = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  location: {
    id: string;
    name: string;
    area: string | null;
  };
  service: {
    id: string;
    name: string;
    durationMin: number;
    priceCents: number;
  };
  staff: {
    id: string;
    name: string;
  };
  startsAt: Date;
  priceCents: number;
};

const AVAILABILITY_RESULT_LIMIT = 50;
const TIME_WINDOW_MINUTES = 30;

function slotMatchesTime(slot: Date, time?: string) {
  if (!time) return true;
  const target = parseSalonTime(time);
  if (target == null) return true;
  return Math.abs(salonMinutesOfDay(slot) - target) <= TIME_WINDOW_MINUTES;
}

export async function searchMarketplaceAvailability(input: {
  categorySlug?: string;
  serviceId?: string;
  serviceName?: string;
  area?: string;
  date: Date;
  time?: string;
}): Promise<MarketplaceAvailabilityResult[]> {
  const area = input.area?.trim() || undefined;
  const categorySlug = input.categorySlug?.trim() || undefined;
  const serviceId = input.serviceId?.trim() || undefined;
  const serviceName = input.serviceName?.trim() || undefined;
  const staffInArea = {
    staff: {
      active: true,
      location: {
        active: true,
        ...(area ? { area } : {}),
      },
    },
  } as const;

  const services = await prisma.service.findMany({
    where: {
      active: true,
      organization: { published: true },
      staff: { some: staffInArea },
      ...(serviceId ? { id: serviceId } : {}),
      ...(serviceName && !serviceId ? { name: serviceName } : {}),
      ...(categorySlug && !serviceId ? { category: { slug: categorySlug } } : {}),
    },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, published: true },
      },
      staff: {
        where: staffInArea,
        select: {
          staff: {
            select: {
              id: true,
              name: true,
              location: {
                select: { id: true, name: true, area: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ priceCents: "asc" }, { name: "asc" }],
  });

  const results: MarketplaceAvailabilityResult[] = [];

  for (const service of services) {
    if (!service.organization.published) continue;
    for (const link of service.staff) {
      const slots = await getAvailableSlotsForDay({
        organizationId: service.organization.id,
        staffId: link.staff.id,
        durationMin: service.durationMin,
        date: input.date,
      });
      for (const startsAt of slots) {
        if (!slotMatchesTime(startsAt, input.time)) continue;
        results.push({
          organization: {
            id: service.organization.id,
            name: service.organization.name,
            slug: service.organization.slug,
          },
          location: link.staff.location,
          service: {
            id: service.id,
            name: service.name,
            durationMin: service.durationMin,
            priceCents: service.priceCents,
          },
          staff: { id: link.staff.id, name: link.staff.name },
          startsAt,
          priceCents: service.priceCents,
        });
      }
    }
  }

  return results
    .sort((left, right) => {
      const timeDelta = left.startsAt.getTime() - right.startsAt.getTime();
      if (timeDelta !== 0) return timeDelta;
      return left.priceCents - right.priceCents;
    })
    .slice(0, AVAILABILITY_RESULT_LIMIT);
}

/**
 * Search availability across multiple Manila calendar days (weekend / earliest).
 * Stops early for `earliest` once the result cap is filled from the first day(s) with slots.
 */
export async function searchMarketplaceAvailabilityAcrossDates(input: {
  categorySlug?: string;
  serviceId?: string;
  serviceName?: string;
  area?: string;
  dates: Date[];
  time?: string;
  /** When true, stop after the first day that yields any slots. */
  stopOnFirstDayWithResults?: boolean;
}): Promise<MarketplaceAvailabilityResult[]> {
  const merged: MarketplaceAvailabilityResult[] = [];

  for (const date of input.dates) {
    const dayResults = await searchMarketplaceAvailability({
      categorySlug: input.categorySlug,
      serviceId: input.serviceId,
      serviceName: input.serviceName,
      area: input.area,
      date,
      time: input.time,
    });
    if (dayResults.length === 0) continue;
    merged.push(...dayResults);
    if (input.stopOnFirstDayWithResults) {
      break;
    }
    if (merged.length >= AVAILABILITY_RESULT_LIMIT) {
      break;
    }
  }

  return merged
    .sort((left, right) => {
      const timeDelta = left.startsAt.getTime() - right.startsAt.getTime();
      if (timeDelta !== 0) return timeDelta;
      return left.priceCents - right.priceCents;
    })
    .slice(0, AVAILABILITY_RESULT_LIMIT);
}
