import { prisma } from "@/lib/prisma";

const activeServicePickerInclude = {
  category: true,
} as const;

const activeServicePickerOrder = [
  { category: { sortOrder: "asc" as const } },
  { name: "asc" as const },
];

export async function listCustomerCatalog(organizationId: string) {
  return prisma.serviceCategory.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
    include: {
      services: {
        where: { active: true },
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function listActiveStaff(organizationId: string) {
  return prisma.staff.findMany({
    where: { organizationId, active: true },
    orderBy: { name: "asc" },
    include: {
      services: {
        include: { service: true },
      },
    },
  });
}

export async function listBookingServices(organizationId: string) {
  return prisma.service.findMany({
    where: { organizationId, active: true },
    include: { category: true, staff: true },
    orderBy: activeServicePickerOrder,
  });
}

export async function listBookingStaff(organizationId: string, locationId?: string) {
  return prisma.staff.findMany({
    where: {
      organizationId,
      active: true,
      location: { active: true },
      ...(locationId ? { locationId } : {}),
    },
    include: { services: true },
    orderBy: { name: "asc" },
  });
}

export async function listAdminCategories(organizationId: string) {
  return prisma.serviceCategory.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { services: true } } },
  });
}

export async function getCategoryById(organizationId: string, id: string) {
  return prisma.serviceCategory.findFirst({
    where: { id, organizationId },
  });
}

export async function listAdminCatalog(organizationId: string) {
  return prisma.serviceCategory.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
    include: {
      services: {
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function listAdminStaffBoard(organizationId: string) {
  return prisma.staff.findMany({
    where: { organizationId },
    include: {
      services: { include: { service: true } },
      schedules: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function listActiveServicesForPicker(organizationId: string) {
  return prisma.service.findMany({
    where: { organizationId, active: true },
    include: activeServicePickerInclude,
    orderBy: activeServicePickerOrder,
  });
}

export async function getStaffForEdit(organizationId: string, id: string) {
  return prisma.staff.findFirst({
    where: { id, organizationId },
    include: { services: true },
  });
}

export async function getStaffById(organizationId: string, id: string) {
  return prisma.staff.findFirst({ where: { id, organizationId } });
}

export async function getServiceForEdit(organizationId: string, id: string) {
  return prisma.service.findFirst({
    where: { id, organizationId },
  });
}

export async function listCategoryOptions(organizationId: string) {
  return prisma.serviceCategory.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getOrganizationForSettings(organizationId: string) {
  return prisma.organization.findUnique({ where: { id: organizationId } });
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uniqueCategorySlug(
  organizationId: string,
  name: string,
  excludeId?: string,
) {
  const base = slugify(name) || "category";
  let candidate = base;
  let suffix = 2;

  while (
    await prisma.serviceCategory.findFirst({
      where: {
        organizationId,
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

export function parseRequiredString(value: FormDataEntryValue | null, field: string) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`${field} is required.`);
  }
  return text;
}

export function parseOptionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function parsePositiveInt(value: FormDataEntryValue | null, field: string) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number) || number < 1) {
    throw new Error(`${field} must be at least 1.`);
  }
  return number;
}

export function parseNonNegativeInt(value: FormDataEntryValue | null, field: string) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${field} must be zero or greater.`);
  }
  return number;
}

export function parsePesoToCentavos(value: FormDataEntryValue | null, field: string) {
  const text = String(value ?? "").trim().replace(",", ".");
  const amount = Number.parseFloat(text);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${field} must be a valid amount.`);
  }
  return Math.round(amount * 100);
}

export function parseBooleanCheckbox(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

export function parseSortOrder(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) {
    return 0;
  }
  const number = Number.parseInt(text, 10);
  if (!Number.isFinite(number)) {
    throw new Error("Sort order must be a number.");
  }
  return number;
}
