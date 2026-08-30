import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import type { MarketplaceAvailabilityResult } from "@/lib/marketplace";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export function AvailabilityResults({
  results,
}: {
  results: MarketplaceAvailabilityResult[];
}) {
  if (results.length === 0) {
    return (
      <EmptyState
        title="No staff availability matches these filters"
        description="Try another day or time, or browse salons without a date."
      >
        <Link href="/" className={secondaryButtonClass}>
          Browse salons
        </Link>
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {results.map((result) => {
        const params = new URLSearchParams({
          serviceId: result.service.id,
          locationId: result.location.id,
          staffId: result.staff.id,
          startsAt: result.startsAt.toISOString(),
        });
        const key = `${result.service.id}-${result.staff.id}-${result.startsAt.toISOString()}`;

        return (
          <li key={key}>
            <article
              className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
              data-testid="availability-result"
            >
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                {result.service.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {result.organization.name}
                {result.location.area ? ` · ${result.location.area}` : ""}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {result.staff.name} · {result.location.name}
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {formatDay(result.startsAt)} · {formatTime(result.startsAt)} ·{" "}
                {formatPrice(result.priceCents)}
              </p>
              <div className="mt-4">
                <Link
                  href={`/s/${result.organization.slug}/book?${params.toString()}`}
                  className={`${primaryButtonClass} w-full sm:w-auto`}
                  data-testid="book-availability"
                >
                  Book
                </Link>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
