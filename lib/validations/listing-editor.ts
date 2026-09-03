import { z } from "zod";
import {
  DEFAULT_STOREFRONT_LAYOUT,
  STOREFRONT_SECTIONS,
  type StorefrontSectionId,
} from "@/lib/listing-layout";

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #FFFFFF.");

export const listingThemeSchema = z.object({
  backgroundColor: hexColor,
  textColor: hexColor,
  accentColor: hexColor,
  fontScale: z.enum(["sm", "md", "lg"]),
});

export const storefrontLayoutSchema = z
  .array(z.enum(STOREFRONT_SECTIONS))
  .min(1)
  .transform((sections) => {
    const seen = new Set<string>();
    const result: StorefrontSectionId[] = [];
    for (const section of sections) {
      if (!seen.has(section)) {
        seen.add(section);
        result.push(section);
      }
    }
    for (const section of DEFAULT_STOREFRONT_LAYOUT) {
      if (!seen.has(section)) {
        result.push(section);
      }
    }
    return result;
  });

export const listingPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  theme: listingThemeSchema,
  layout: storefrontLayoutSchema,
  savedAt: z.string(),
});

export const listingPresetsSchema = z.array(listingPresetSchema).max(5);

export const listingEditorDraftSchema = z.object({
  theme: listingThemeSchema,
  layout: storefrontLayoutSchema,
  tagline: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  highlights: z.array(z.string().trim().min(1).max(80)).max(5).default([]),
  featuredServiceId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type ListingEditorDraft = z.infer<typeof listingEditorDraftSchema>;

export function parseListingEditorDraft(raw: unknown) {
  return listingEditorDraftSchema.safeParse(raw);
}

export function parseListingEditorForm(formData: FormData) {
  const highlights = formData
    .getAll("highlights")
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);

  let themeRaw: unknown;
  let layoutRaw: unknown;
  try {
    themeRaw = JSON.parse(String(formData.get("theme") ?? "{}"));
    layoutRaw = JSON.parse(String(formData.get("layout") ?? "[]"));
  } catch {
    return { success: false as const, error: "Invalid theme or layout data." };
  }

  const parsed = listingEditorDraftSchema.safeParse({
    theme: themeRaw,
    layout: layoutRaw,
    tagline: String(formData.get("tagline") ?? ""),
    highlights,
    featuredServiceId: String(formData.get("featuredServiceId") ?? ""),
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(" ");
    return { success: false as const, error: message };
  }

  return { success: true as const, data: parsed.data };
}
