import { z } from "zod";

export const requiredString = (field: string) =>
  z.string().trim().min(1, `${field} is required.`);

export const pesoToCentavosSchema = z.string().trim().transform((value) => {
  const amount = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Amount must be valid.");
  }
  return Math.round(amount * 100);
});

export const positiveIntSchema = (field: string) =>
  z.coerce.number().int().min(1, `${field} must be at least 1.`);

export const sortOrderSchema = z
  .union([z.literal(""), z.coerce.number().int()])
  .transform((value) => (value === "" ? 0 : value));

export function formatZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
