import { z } from "zod";

export const updateStaffSchema = z.object({
  id: z.string().trim().min(1, "Staff id is required."),
  locationId: z.string().trim().min(1, "Location is required."),
  name: z.string().trim().min(1, "Name is required."),
  bio: z.string().trim().optional(),
  active: z.boolean(),
});

export function formatZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
