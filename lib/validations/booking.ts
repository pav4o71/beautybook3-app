import { z } from "zod";
import { MAX_BOOKING_SERVICES } from "@/lib/booking-limits";
import { normalizePhone } from "@/lib/phone";

export const customerNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(100, "Name cannot exceed 100 characters.");

export const customerPhoneSchema = z
  .string()
  .trim()
  .max(40, "Phone number is too long.")
  .transform((val, ctx) => {
    const result = normalizePhone(val);
    if (!result.valid || !result.e164) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          result.error ??
          "Enter a valid Philippine mobile number (e.g. 0917 123 4567) or international number.",
      });
      return z.NEVER;
    }
    return result.e164;
  });

export const optionalCustomerPhoneSchema = z
  .string()
  .trim()
  .max(40, "Phone number is too long.")
  .optional()
  .nullable()
  .transform((val, ctx) => {
    if (!val || val.length === 0) return null;
    const result = normalizePhone(val);
    if (!result.valid || !result.e164) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          result.error ??
          "Enter a valid Philippine mobile number (e.g. 0917 123 4567) or international number.",
      });
      return z.NEVER;
    }
    return result.e164;
  });

export const customerEmailSchema = z
  .string()
  .trim()
  .max(254, "Email is too long.")
  .optional()
  .nullable()
  .transform((val, ctx) => {
    if (!val || val.length === 0) return null;
    const emailParsed = z.string().email().safeParse(val);
    if (!emailParsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid email address.",
      });
      return z.NEVER;
    }
    return val.toLowerCase();
  });

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
  customerName: customerNameSchema.optional().nullable(),
  customerPhone: customerPhoneSchema.optional().nullable(),
  customerEmail: customerEmailSchema.optional().nullable(),
});

export const publicBookSlotSchema = bookSlotSchema
  .omit({
    organizationId: true,
    customerId: true,
  })
  .extend({
    locationId: z.string().min(1, "Choose a location."),
    customerName: customerNameSchema,
    customerPhone: customerPhoneSchema,
    customerEmail: customerEmailSchema,
  });

export const walkInBookingSchema = z.object({
  locationId: z.string().min(1, "Choose a location."),
  staffId: z.string().min(1, "Choose a specialist."),
  serviceIds: z
    .array(z.string().min(1))
    .min(1, "Choose at least one service.")
    .max(MAX_BOOKING_SERVICES, `You can book at most ${MAX_BOOKING_SERVICES} services.`),
  startsAt: z.coerce.date({ message: "Choose a valid start time." }),
  customerName: customerNameSchema,
  customerPhone: optionalCustomerPhoneSchema,
  customerEmail: customerEmailSchema,
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
  void _fallbackFirstId;
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
