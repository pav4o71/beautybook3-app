import { prisma } from "@/lib/prisma";

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
