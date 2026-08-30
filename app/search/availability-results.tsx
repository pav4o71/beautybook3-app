import Link from "next/link";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import type { MarketplaceAvailabilityResult } from "@/lib/marketplace";
import { primaryButtonClass } from "@/lib/ui";

export function AvailabilityResults({
  results,
}: {
  results: MarketplaceAvailabilityResult[];
}) {
  if (results.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No staff availability matches these filters. Try another day or time.
      </p>
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
              className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-4"
              data-testid="availability-result"
            >
              <h2 className="font-medium text-zinc-900">{result.service.name}</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {result.organization.name}
                {result.location.area ? ` · ${result.location.area}` : ""}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {result.staff.name} · {result.location.name}
              </p>
              <p className="mt-1 text-sm text-zinc-900">
                {formatDay(result.startsAt)} · {formatTime(result.startsAt)}
                <span className="ml-2">{formatPrice(result.priceCents)}</span>
              </p>
              <div className="mt-4">
                <Link
                  href={`/s/${result.organization.slug}/book?${params.toString()}`}
                  className={primaryButtonClass}
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