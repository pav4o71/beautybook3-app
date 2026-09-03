import { z } from "zod";

const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(500, `${label} must be 500 characters or fewer.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: `${label} must be a valid http(s) URL.` },
    );

const optionalPathOrUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(500, `${label} must be 500 characters or fewer.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const hexColor = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => !value || /^#[0-9A-Fa-f]{6}$/.test(value),
    { message: "Accent color must be a hex value like #E11D48." },
  );

export const listingProfileSchema = z.object({
  tagline: z
    .string()
    .trim()
    .max(120, "Tagline must be 120 characters or fewer.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  highlights: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Highlight cannot be empty.")
        .max(80, "Each highlight must be 80 characters or fewer."),
    )
    .max(5, "You can add up to 5 highlights.")
    .default([]),
  featuredServiceId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  logoUrl: optionalPathOrUrl("Logo URL"),
  accentColor: hexColor,
  instagramUrl: optionalUrl("Instagram URL"),
  facebookUrl: optionalUrl("Facebook URL"),
  websiteUrl: optionalUrl("Website URL"),
});

export type ListingProfileInput = z.infer<typeof listingProfileSchema>;

export function parseListingProfileForm(formData: FormData) {
  const highlights = formData
    .getAll("highlights")
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);

  return listingProfileSchema.safeParse({
    tagline: String(formData.get("tagline") ?? ""),
    highlights,
    featuredServiceId: String(formData.get("featuredServiceId") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
    accentColor: String(formData.get("accentColor") ?? ""),
    instagramUrl: String(formData.get("instagramUrl") ?? ""),
    facebookUrl: String(formData.get("facebookUrl") ?? ""),
    websiteUrl: String(formData.get("websiteUrl") ?? ""),
  });
}
