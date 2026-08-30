export const MANILA_AREAS = [
  "Makati",
  "BGC (Taguig)",
  "Quezon City",
  "Mandaluyong",
  "Pasig",
  "Ortigas",
  "Alabang",
  "Parañaque",
  "Las Piñas",
  "Manila (City Proper)",
  "San Juan",
  "Pasay",
  "Taguig",
  "Marikina",
] as const;

export type ManilaArea = (typeof MANILA_AREAS)[number];

export function isManilaArea(value: string): value is ManilaArea {
  return (MANILA_AREAS as readonly string[]).includes(value);
}
