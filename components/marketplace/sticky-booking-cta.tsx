import Link from "next/link";
import { primaryButtonClass } from "@/lib/ui";

/**
 * Calm sticky booking CTA for mobile and desktop storefronts.
 * Uses safe-area padding; no flashy animation.
 */
export function StickyBookingCta({
  href,
  label = "Book now",
  hint,
  testId = "sticky-book-cta",
}: {
  href: string;
  label?: string;
  hint?: string;
  testId?: string;
}) {
  return (
    <div
      className="sticky bottom-0 z-20 -mx-4 border-t border-zinc-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-white/90"
      data-testid={testId}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        {hint ? <p className="text-sm text-zinc-600">{hint}</p> : <span className="sr-only">{label}</span>}
        <Link
          href={href}
          className={`${primaryButtonClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900`}
          aria-label={label}
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
