import { z } from "zod";
import { MAX_BOOKING_SERVICES } from "@/lib/booking-limits";

export const bookSlotSchema = z.object({
  organizationId: z.string().min(1),
  locationId: z.string().min(1),
  serviceIds: z
    .array(z.string().min(1))
    .min(1, "Choose at least one service.")
    .max(MAX_BOOKING_SERVICES, `You can book at most ${MAX_BOOKING_SERVICES} services.`),
  staffId: z.string().min(1),
  startsAt: z.coerce.date(),
  customerId: z.string().min(1).nullable().optional(),
});

export const publicBookSlotSchema = bookSlotSchema
  .omit({
    organizationId: true,
    customerId: true,
  })
  .extend({
    locationId: z.string().min(1, "Choose a location."),
  });

export function parseServiceIdsFromForm(formData: FormData): string[] {
  const collected: string[] = [];
  for (const value of formData.getAll("serviceIds")) {
    collected.push(...String(value).split(","));
  }
  const lone = formData.get("serviceId");
  if (lone) {
    collected.push(String(lone));
  }
  return uniqueServiceIds(collected);
}

export type QueryParam = string | string[] | undefined;

export function firstQueryValue(value: QueryParam): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function queryValues(value: QueryParam): string[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function parseServiceIdsFromQuery(query: {
  serviceIds?: QueryParam;
  serviceId?: QueryParam;
}): string[] {
  const collected: string[] = [];
  for (const part of queryValues(query.serviceIds)) {
    collected.push(...part.split(","));
  }
  for (const part of queryValues(query.serviceId)) {
    collected.push(part);
  }
  return uniqueServiceIds(collected);
}

export function resolveSelectedServiceIds(
  query: {
    serviceIds?: QueryParam;
    serviceId?: QueryParam;
    locationId?: QueryParam;
  },
  validIds: Set<string> | string[],
  _fallbackFirstId?: string,
): string[] {
  const allowed = validIds instanceof Set ? validIds : new Set(validIds);
  const requested = parseServiceIdsFromQuery(query).filter((id) => allowed.has(id));
  return requested.slice(0, MAX_BOOKING_SERVICES);
}

export function uniqueServiceIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
}

export function formatZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
