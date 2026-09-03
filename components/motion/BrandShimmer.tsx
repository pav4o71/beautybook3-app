/**
 * Subtle shimmer for the brand wordmark — inspired by Magic UI shimmer text,
 * implemented with CSS only (no dependency).
 */
export function BrandShimmer({ children }: { children: React.ReactNode }) {
  return <span className="bb-brand-shimmer">{children}</span>;
}
