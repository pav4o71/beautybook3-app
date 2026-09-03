import type { ReactNode } from "react";

/**
 * Soft mesh atmosphere behind the discovery hero.
 * Visual idea inspired by Magic UI / Aceternity gradient backdrops —
 * original colors tuned for BeautyBook (blush + sand, not purple glow).
 */
export function HeroAtmosphere({ children }: { children: ReactNode }) {
  return (
    <div className="bb-hero relative overflow-hidden rounded-2xl border border-rose-100/80">
      <div className="bb-hero-mesh pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="bb-hero-shine pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 px-5 py-8 sm:px-8 sm:py-10">{children}</div>
    </div>
  );
}
