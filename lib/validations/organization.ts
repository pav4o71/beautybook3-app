import { z } from "zod";

export const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Business name is required."),
  timezone: z.string().trim().min(1).default("Asia/Manila"),
});

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2, "Business name is required."),
  timezone: z.string().trim().min(1),
  published: z.boolean(),
});

export function formatZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
