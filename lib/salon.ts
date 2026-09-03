import type { Weekday } from "@/app/generated/prisma/enums";
import { publicLocationWhere } from "@/lib/locations";
import { mapOrganizationListingProfile, type PublicListingProfile } from "@/lib/listing";
import { prisma } from "@/lib/prisma";
import { orderedWeekdays } from "@/lib/schedule";

export type SalonHoursWindow = {
  weekday: Weekday;
  startTime: string;
  endTime: string;
};

export type SalonStorefrontService = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
};

export type SalonStorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  services: SalonStorefrontService[];
};

export type SalonStorefrontLocation = {
  id: string;
  name: string;
  address: string | null;
  area: string | null;
  phone: string | null;
  isDefault: boolean;
  hours: SalonHoursWindow[];
};

export type SalonStorefrontStaff = {
  id: string;
  name: string;
  photoUrl: string | null;
  locationId: string;
  serviceIds: string[];
};

export type SalonStorefront = PublicListingProfile & {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  coverImageUrl: string | null;
  locations: SalonStorefrontLocation[];
  categories: SalonStorefrontCategory[];
  staff: SalonStorefrontStaff[];
};

function hoursForLocation(
  locationId: string,
  rows: {
    locationId: string;
    weekday: Weekday;
    startTime: string;
    endTime: string;
  }[],
): SalonHoursWindow[] {
  const byWeekday = new Map<Weekday, { startTime: string; endTime: string }>();

  for (const row of rows) {
    if (row.locationId !== locationId) {
      continue;
    }
    const current = byWeekday.get(row.weekday);
    if (!current) {
      byWeekday.set(row.weekday, {
        startTime: row.startTime,
        endTime: row.endTime,
      });
      continue;
    }
    byWeekday.set(row.weekday, {
      startTime: row.startTime < current.startTime ? row.startTime : current.startTime,
      endTime: row.endTime > current.endTime ? row.endTime : current.endTime,
    });
  }

  return orderedWeekdays()
    .filter((weekday) => byWeekday.has(weekday))
    .map((weekday) => {
      const window = byWeekday.get(weekday);
      if (!window) {
        throw new Error("Missing hours window.");
      }
      return { weekday, startTime: window.startTime, endTime: window.endTime };
    });
}

export async function getSalonStorefront(slug: string): Promise<SalonStorefront | null> {
  const organization = await prisma.organization.findUnique({
    where: { slug },
    include: {
      featuredService: {
        where: { active: true },
        include: { category: true },
      },
      locations: {
        where: publicLocationWhere,
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      },
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          services: {
            where: { active: true },
            orderBy: { name: "asc" },
          },
        },
      },
      staff: {
        where: { active: true, location: { active: true } },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          photoUrl: true,
          locationId: true,
          services: { select: { serviceId: true } },
        },
      },
      schedules: {
        select: {
          staffId: true,
          locationId: true,
          weekday: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (!organization?.published) {
    return null;
  }

  const activeStaffIds = new Set(organization.staff.map((person) => person.id));
  const activeSchedules = organization.schedules.filter((row) =>
    activeStaffIds.has(row.staffId),
  );

  const fallbackFeatured = organization.categories
    .flatMap((category) =>
      category.services.map((service) => ({
        ...service,
        category: { name: category.name },
      })),
    )
    .sort((left, right) => left.priceCents - right.priceCents)[0] ?? null;

  const listing = mapOrganizationListingProfile(organization, fallbackFeatured);

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    phone: organization.phone,
    coverImageUrl: organization.coverImageUrl,
    ...listing,
    locations: organization.locations.map((location) => ({
      id: location.id,
      name: location.name,
      address: location.address,
      area: location.area,
      phone: location.phone,
      isDefault: location.isDefault,
      hours: hoursForLocation(location.id, activeSchedules),
    })),
    categories: organization.categories
      .filter((category) => category.services.length > 0)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        services: category.services.map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          durationMin: service.durationMin,
          priceCents: service.priceCents,
        })),
      })),
    staff: organization.staff.map((person) => ({
      id: person.id,
      name: person.name,
      photoUrl: person.photoUrl,
      locationId: person.locationId,
      serviceIds: person.services.map((row) => row.serviceId),
    })),
  };
}
