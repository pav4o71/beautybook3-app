import { z } from "zod";

export const bookSlotSchema = z.object({
  organizationId: z.string().min(1),
  locationId: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  startsAt: z.coerce.date(),
  customerId: z.string().min(1).nullable().optional(),
});

export const publicBookSlotSchema = bookSlotSchema.omit({
  organizationId: true,
  locationId: true,
  customerId: true,
});

export function formatZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
