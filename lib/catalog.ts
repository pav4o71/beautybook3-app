import { prisma } from "@/lib/prisma";

const activeServicePickerInclude = {
  category: true,
} as const;

const activeServicePickerOrder = [
  { category: { sortOrder: "asc" as const } },
  { name: "asc" as const },
];

export async function listCustomerCatalog() {
  return prisma.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      services: {
        where: { active: true },
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function listActiveStaff() {
  return prisma.staff.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      services: {
        include: { service: true },
      },
    },
  });
}

export async function listBookingServices() {
  return prisma.service.findMany({
    where: { active: true },
    include: { category: true, staff: true },
    orderBy: activeServicePickerOrder,
  });
}

export async function listBookingStaff() {
  return prisma.staff.findMany({
    where: { active: true },
    include: { services: true },
    orderBy: { name: "asc" },
  });
}

export async function listAdminCategories() {
  return prisma.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { services: true } } },
  });
}

export async function getCategoryById(id: string) {
  return prisma.serviceCategory.findUnique({ where: { id } });
}

export async function listAdminCatalog() {
  return prisma.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      services: {
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function listAdminStaffBoard() {
  return prisma.staff.findMany({
    include: {
      services: { include: { service: true } },
      schedules: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function listActiveServicesForPicker() {
  return prisma.service.findMany({
    where: { active: true },
    include: activeServicePickerInclude,
    orderBy: activeServicePickerOrder,
  });
}

export async function getStaffForEdit(id: string) {
  return prisma.staff.findUnique({
    where: { id },
    include: { services: true },
  });
}

export async function getStaffById(id: string) {
  return prisma.staff.findUnique({ where: { id } });
}

export async function getServiceForEdit(id: string) {
  return prisma.service.findUnique({ where: { id } });
}

export async function listCategoryOptions() {
  return prisma.serviceCategory.findMany({ orderBy: { sortOrder: "asc" } });
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uniqueCategorySlug(name: string, excludeId?: string) {
  const base = slugify(name) || "category";
  let candidate = base;
  let suffix = 2;

  while (
    await prisma.serviceCategory.findFirst({
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
