import { z } from "zod";

export const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Business name is required."),
  timezone: z.string().trim().min(1).default("Asia/Manila"),
});

const optionalProfileText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2, "Business name is required."),
  timezone: z.string().trim().min(1),
  published: z.boolean(),
  description: optionalProfileText(2000, "Description must be 2000 characters or fewer."),
  phone: optionalProfileText(40, "Phone must be 40 characters or fewer."),
});

export function formatZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
