import type { CSSProperties, ReactNode } from "react";
import { resolveListingTheme, themeToCssVars, type ListingTheme } from "@/lib/listing-theme";
import type { ListingTier } from "@/app/generated/prisma/enums";

export function ListingThemeProvider({
  listingTheme,
  accentColor,
  tier,
  children,
  className = "",
}: {
  listingTheme: unknown;
  accentColor: string | null;
  tier: ListingTier;
  children: ReactNode;
  className?: string;
}) {
  const theme = resolveListingTheme(listingTheme, accentColor, tier);
  const vars = themeToCssVars(theme);

  return (
    <div
      className={className}
      style={{
        ...vars,
        backgroundColor: "var(--listing-bg)",
        color: "var(--listing-text)",
        fontSize: "var(--listing-font-scale)",
      }}
    >
      {children}
    </div>
  );
}

export function listingAccentStyle(theme: ListingTheme): CSSProperties {
  return { color: theme.accentColor, borderColor: theme.accentColor };
}
