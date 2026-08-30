import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Public catalog/booking: only branches that can actually take appointments. */
export const publicLocationWhere = {
  active: true,
  staff: { some: { active: true } },
} as const;

export async function listLocations(organizationId: string) {
  return prisma.location.findMany({
    where: { organizationId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          staff: { where: { active: true } },
          appointments: true,
        },
      },
    },
  });
}

export async function getLocationById(organizationId: string, locationId: string) {
  return prisma.location.findFirst({
    where: { id: locationId, organizationId },
    include: {
      _count: {
        select: {
          staff: { where: { active: true } },
          appointments: true,
        },
      },
    },
  });
}

export async function countActiveLocations(organizationId: string) {
  return prisma.location.count({
    where: { organizationId, active: true },
  });
}

async function clearDefaultLocations(
  organizationId: string,
  tx: Prisma.TransactionClient,
) {
  await tx.location.updateMany({
    where: { organizationId, isDefault: true },
    data: { isDefault: false },
  });
}

export async function createLocation(
  organizationId: string,
  input: {
    name: string;
    address?: string | null;
    area?: string | null;
    phone?: string | null;
    timezone: string;
    isDefault?: boolean;
  },
) {
  const existingCount = await prisma.location.count({ where: { organizationId } });
  const shouldBeDefault = existingCount === 0 || input.isDefault === true;

  return prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await clearDefaultLocations(organizationId, tx);
    }

    return tx.location.create({
      data: {
        organizationId,
        name: input.name,
        address: input.address ?? null,
        area: input.area ?? null,
        phone: input.phone ?? null,
        timezone: input.timezone,
        isDefault: shouldBeDefault,
        active: true,
      },
    });
  });
}

export async function updateLocation(
  organizationId: string,
  locationId: string,
  input: {
    name: string;
    address?: string | null;
    area?: string | null;
    phone?: string | null;
    timezone: string;
    active: boolean;
    isDefault: boolean;
  },
) {
  const existing = await prisma.location.findFirst({
    where: { id: locationId, organizationId },
  });

  if (!existing) {
    throw new Error("Location not found.");
  }

  if (!input.active && existing.isDefault) {
    const otherActive = await prisma.location.count({
      where: {
        organizationId,
        active: true,
        id: { not: locationId },
      },
    });
    if (otherActive === 0) {
      throw new Error("Add another active location before deactivating the default.");
    }
  }

  if (!input.active) {
    const activeStaff = await prisma.staff.count({
      where: { locationId, active: true },
    });
    if (activeStaff > 0) {
      throw new Error("Deactivate or reassign active staff before deactivating this location.");
    }
  }

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await clearDefaultLocations(organizationId, tx);
    }

    const updated = await tx.location.update({
      where: { id: locationId },
      data: {
        name: input.name,
        address: input.address ?? null,
        area: input.area ?? null,
        phone: input.phone ?? null,
        timezone: input.timezone,
        active: input.active,
        isDefault: input.isDefault,
      },
    });

    if (!input.active && existing.isDefault) {
      const replacement = await tx.location.findFirst({
        where: { organizationId, active: true, id: { not: locationId } },
        orderBy: { createdAt: "asc" },
      });
      if (replacement) {
        await clearDefaultLocations(organizationId, tx);
        await tx.location.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }

    const defaultCount = await tx.location.count({
      where: { organizationId, isDefault: true, active: true },
    });
    if (defaultCount === 0) {
      const fallback = await tx.location.findFirst({
        where: { organizationId, active: true },
        orderBy: { createdAt: "asc" },
      });
      if (fallback) {
        await tx.location.update({
          where: { id: fallback.id },
          data: { isDefault: true },
        });
      }
    }

    return updated;
  });
}

export async function setDefaultLocation(organizationId: string, locationId: string) {
  const existing = await prisma.location.findFirst({
    where: { id: locationId, organizationId, active: true },
  });

  if (!existing) {
    throw new Error("Active location not found.");
  }

  return prisma.$transaction(async (tx) => {
    await clearDefaultLocations(organizationId, tx);
    return tx.location.update({
      where: { id: locationId },
      data: { isDefault: true },
    });
  });
}
