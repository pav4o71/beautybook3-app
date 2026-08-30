import { z } from "zod";
import { isManilaArea } from "@/lib/areas";

export const createLocationSchema = z.object({
  name: z.string().trim().min(1, "Location name is required."),
  address: z.string().trim().optional(),
  area: z
    .string()
    .nullable()
    .optional()
    .refine((value) => value == null || isManilaArea(value), "Select a valid Manila area."),
  timezone: z.string().trim().min(1, "Timezone is required."),
  isDefault: z.boolean().optional(),
});

export const updateLocationSchema = z.object({
  name: z.string().trim().min(1, "Location name is required."),
  address: z.string().trim().optional(),
  area: z
    .string()
    .nullable()
    .optional()
    .refine((value) => value == null || isManilaArea(value), "Select a valid Manila area."),
  timezone: z.string().trim().min(1, "Timezone is required."),
  active: z.boolean(),
  isDefault: z.boolean(),
});

export function formatZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
