"use client";

import Link from "next/link";
import { primaryButtonClass } from "@/lib/ui";

/**
 * Mobile sticky summary on the marketplace when a service/category filter is active.
 */
export function MarketplaceStickyCta({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint?: string;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
      data-testid="marketplace-sticky-cta"
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">{label}</p>
          {hint ? <p className="truncate text-xs text-zinc-500">{hint}</p> : null}
        </div>
        <Link
          href={href}
          className={`${primaryButtonClass} shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900`}
        >
          See results
        </Link>
      </div>
    </div>
  );
}
