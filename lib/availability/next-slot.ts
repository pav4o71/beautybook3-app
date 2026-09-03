import { getAvailableSlots } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { publicLocationWhere } from "@/lib/locations";
import {
  addSalonDays,
  salonDayBounds,
  salonIsoDate,
} from "@/lib/timezone";
import type { NextAvailability, NextAvailabilityQuery } from "@/lib/availability/types";

const DEFAULT_HORIZON_DAYS = 7;
const DEFAULT_CONCURRENCY = 4;

function relativeDayFor(startsAt: Date, todayIso: string, tomorrowIso: string) {
  const slotIso = salonIsoDate(startsAt);
  if (slotIso === todayIso) return "today" as const;
  if (slotIso === tomorrowIso) return "tomorrow" as const;
  return "later" as const;
}

/**
 * Find the earliest real bookable slot for an organization within a short horizon.
 * Returns `{ kind: "none" }` when schedules were scanned and no slot exists.
 */
export async function getNextAvailabilityForOrganization(
  input: NextAvailabilityQuery,
): Promise<NextAvailability> {
  const horizonDays = input.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const area = input.area?.trim() || undefined;
  const serviceName = input.serviceName?.trim() || undefined;
  const serviceId = input.serviceId?.trim() || undefined;

  const staffLocation = {
    active: true,
    location: {
      ...publicLocationWhere,
      ...(area ? { area } : {}),
    },
  } as const;

  const service = await prisma.service.findFirst({
    where: {
      organizationId: input.organizationId,
      active: true,
      staff: { some: { staff: staffLocation } },
      ...(serviceId ? { id: serviceId } : {}),
      ...(serviceName && !serviceId ? { name: serviceName } : {}),
    },
    orderBy: { priceCents: "asc" },
    select: {
      id: true,
      name: true,
      durationMin: true,
      staff: {
        where: { staff: staffLocation },
        select: { staffId: true },
      },
    },
  });

  const scannedThrough = addSalonDays(salonDayBounds().start, horizonDays - 1);

  if (!service || service.staff.length === 0) {
    return { kind: "none", scannedThrough };
  }

  const staffIds = [...new Set(service.staff.map((row) => row.staffId))];
  let earliest: Date | null = null;

  for (const staffId of staffIds) {
    const slots = await getAvailableSlots({
      organizationId: input.organizationId,
      staffId,
      durationMin: service.durationMin,
      days: horizonDays,
    });
    const first = slots[0];
    if (!first) continue;
    if (!earliest || first.getTime() < earliest.getTime()) {
      earliest = first;
    }
  }

  if (!earliest) {
    return { kind: "none", scannedThrough };
  }

  const todayIso = salonIsoDate();
  const tomorrowIso = salonIsoDate(addSalonDays(salonDayBounds().start, 1));

  return {
    kind: "slot",
    startsAt: earliest,
    relative: relativeDayFor(earliest, todayIso, tomorrowIso),
    serviceId: service.id,
    serviceName: service.name,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/**
 * Attach next-availability to marketplace listings with a concurrency limit.
 * On unexpected errors for a single org, leave `nextAvailability` null (omit badge).
 */
export async function attachNextAvailability<
  T extends { id: string; featuredService: { id: string; name: string } | null },
>(
  listings: T[],
  input: {
    serviceName?: string;
    area?: string;
    concurrency?: number;
    horizonDays?: number;
  } = {},
): Promise<(T & { nextAvailability: NextAvailability | null })[]> {
  const concurrency = input.concurrency ?? DEFAULT_CONCURRENCY;
  const results = await mapWithConcurrency(listings, concurrency, async (listing) => {
    try {
      const nextAvailability = await getNextAvailabilityForOrganization({
        organizationId: listing.id,
        serviceId: input.serviceName ? undefined : listing.featuredService?.id,
        serviceName: input.serviceName,
        area: input.area,
        horizonDays: input.horizonDays,
      });
      return { ...listing, nextAvailability };
    } catch {
      // Prefer omitting the badge over showing incorrect times.
      return { ...listing, nextAvailability: null };
    }
  });
  return results;
}
