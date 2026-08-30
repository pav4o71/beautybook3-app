import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { MarketplaceListing } from "@/lib/marketplace";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export function BusinessCard({ listing }: { listing: MarketplaceListing }) {
  const { locations, featuredService, serviceCount } = listing;

  return (
    <article
      className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-4"
      data-testid={`business-${listing.id}`}
    >
      <h2 className="font-medium text-zinc-900">{listing.name}</h2>

      {featuredService ? (
        <p className="mt-1 text-sm text-zinc-600">
          From{" "}
          <span className="font-medium text-zinc-900">
            {formatPrice(featuredService.priceCents)}
          </span>
          {" · "}
          {featuredService.name}
        </p>
      ) : (
        <p className="mt-1 text-sm text-zinc-500">No bookable services yet</p>
      )}

      <p className="mt-1 text-xs text-zinc-500">
        {serviceCount} active service{serviceCount === 1 ? "" : "s"}
      </p>

      {locations.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No active locations</p>
      ) : (
        <ul className="mt-2 flex-1 space-y-1">
          {locations.map((location) => (
            <li key={location.id} className="text-sm text-zinc-600">
              <span className="font-medium text-zinc-800">{location.name}</span>
              {location.isDefault ? (
                <span className="ml-1 text-xs text-zinc-500">(default)</span>
              ) : null}
              {location.address ? (
                <span className="block text-zinc-500">{location.address}</span>
              ) : null}
              {location.area ? (
                <span className="mt-0.5 inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                  {location.area}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/s/${listing.slug}`}
          className={secondaryButtonClass}
        >
          View salon
        </Link>
        <Link
          href={`/s/${listing.slug}/book`}
          className={primaryButtonClass}
          data-testid={`book-now-${listing.id}`}
        >
          Book now
        </Link>
      </div>
    </article>
  );
}
