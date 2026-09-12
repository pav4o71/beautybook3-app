import { prisma } from "@/lib/prisma";

export async function updateServiceForOrganization(
  organizationId: string,
  serviceId: string,
  input: {
    categoryId: string;
    name: string;
    description: string | null;
    durationMin: number;
    priceCents: number;
    active: boolean;
  },
) {
  const [service, category] = await Promise.all([
    prisma.service.findFirst({
      where: { id: serviceId, organizationId },
    }),
    prisma.serviceCategory.findFirst({
      where: { id: input.categoryId, organizationId },
    }),
  ]);

  if (!service) {
    throw new Error("Service not found.");
  }
  if (!category) {
    throw new Error("Category not found.");
  }

  const updated = await prisma.service.updateMany({
    where: { id: serviceId, organizationId },
    data: {
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      durationMin: input.durationMin,
      priceCents: input.priceCents,
      active: input.active,
    },
  });

  if (updated.count !== 1) {
    throw new Error("Service not found.");
  }
}
