import type { CSSProperties } from "react";
import type { ListingTier } from "@/app/generated/prisma/enums";
import { isPremiumListing } from "@/lib/listing";

export type FontScale = "sm" | "md" | "lg";

export type ListingTheme = {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontScale: FontScale;
};

export const DEFAULT_LISTING_THEME: ListingTheme = {
  backgroundColor: "#FFFFFF",
  textColor: "#18181B",
  accentColor: "#18181B",
  fontScale: "md",
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function parseListingTheme(raw: unknown): ListingTheme {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_LISTING_THEME };
  }
  const obj = raw as Record<string, unknown>;
  return {
    backgroundColor:
      typeof obj.backgroundColor === "string" && HEX_COLOR.test(obj.backgroundColor)
        ? obj.backgroundColor
        : DEFAULT_LISTING_THEME.backgroundColor,
    textColor:
      typeof obj.textColor === "string" && HEX_COLOR.test(obj.textColor)
        ? obj.textColor
        : DEFAULT_LISTING_THEME.textColor,
    accentColor:
      typeof obj.accentColor === "string" && HEX_COLOR.test(obj.accentColor)
        ? obj.accentColor
        : DEFAULT_LISTING_THEME.accentColor,
    fontScale:
      obj.fontScale === "sm" || obj.fontScale === "md" || obj.fontScale === "lg"
        ? obj.fontScale
        : DEFAULT_LISTING_THEME.fontScale,
  };
}

export function resolveListingTheme(
  listingTheme: unknown,
  accentColor: string | null,
  tier: ListingTier,
): ListingTheme {
  const theme = parseListingTheme(listingTheme);
  if (!isPremiumListing(tier)) {
    return { ...DEFAULT_LISTING_THEME };
  }
  if (accentColor && HEX_COLOR.test(accentColor) && theme.accentColor === DEFAULT_LISTING_THEME.accentColor) {
    return { ...theme, accentColor };
  }
  return theme;
}

export function themeToCssVars(theme: ListingTheme): CSSProperties {
  const fontScaleClass = {
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
  }[theme.fontScale];

  return {
    "--listing-bg": theme.backgroundColor,
    "--listing-text": theme.textColor,
    "--listing-accent": theme.accentColor,
    "--listing-font-scale": fontScaleClass,
  } as CSSProperties;
}

export function themeCardBorderStyle(theme: ListingTheme, tier: ListingTier) {
  if (!isPremiumListing(tier)) {
    return undefined;
  }
  return { borderColor: theme.accentColor };
}
