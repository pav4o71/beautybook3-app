import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const timeWindowSchema = z
  .object({
    startTime: z.string().regex(timePattern, "Invalid start time."),
    endTime: z.string().regex(timePattern, "Invalid end time."),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "Start time must be before end time.",
    path: ["endTime"],
  });

export const localDateTimeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time."),
});

export function formatZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
