export const STOREFRONT_SECTIONS = [
  "hero",
  "about",
  "gallery",
  "highlights",
  "services",
  "locations",
  "staff",
  "social",
] as const;

export type StorefrontSectionId = (typeof STOREFRONT_SECTIONS)[number];

export const DEFAULT_STOREFRONT_LAYOUT: StorefrontSectionId[] = [
  "hero",
  "about",
  "highlights",
  "gallery",
  "locations",
  "staff",
  "services",
  "social",
];

export function parseStorefrontLayout(raw: unknown): StorefrontSectionId[] {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_STOREFRONT_LAYOUT];
  }
  const allowed = new Set<string>(STOREFRONT_SECTIONS);
  const seen = new Set<string>();
  const result: StorefrontSectionId[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !allowed.has(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    result.push(item as StorefrontSectionId);
  }
  for (const section of DEFAULT_STOREFRONT_LAYOUT) {
    if (!seen.has(section)) {
      result.push(section);
    }
  }
  return result;
}

export function sectionLabel(section: StorefrontSectionId): string {
  const labels: Record<StorefrontSectionId, string> = {
    hero: "Hero (cover + name)",
    about: "About",
    gallery: "Photo gallery",
    highlights: "Highlights",
    services: "Services & booking",
    locations: "Locations & hours",
    staff: "Team",
    social: "Social links",
  };
  return labels[section];
}
