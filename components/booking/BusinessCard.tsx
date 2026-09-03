import Link from "next/link";
import { LocationHeading } from "@/components/booking/location-heading";
import { formatPrice } from "@/lib/format";
import type { MarketplaceListing } from "@/lib/marketplace";
import { focusRingClass, surfaceInteractiveClass } from "@/lib/ui";

const discoveryButtonClass =
  `inline-flex items-center justify-center rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-emerald-50 shadow-sm shadow-emerald-900/15 hover:bg-emerald-700 disabled:opacity-60 ${focusRingClass} focus-visible:ring-emerald-700`;

const discoveryCardClass =
  `${surfaceInteractiveClass} flex h-full flex-col overflow-hidden border-emerald-200/70 hover:border-emerald-300/80 hover:shadow-md hover:shadow-emerald-900/5`;

export function BusinessCard({
  listing,
  serviceName,
}: {
  listing: MarketplaceListing;
  serviceName?: string;
}) {
  const { locations, featuredService } = listing;
  const salonHref = serviceName
    ? `/s/${listing.slug}?service=${encodeURIComponent(serviceName)}`
    : `/s/${listing.slug}`;

  const primaryLocation =
    locations.find((location) => location.isDefault) ?? locations[0] ?? null;
  const extraLocationCount = primaryLocation ? locations.length - 1 : 0;

  return (
    <article
      className={discoveryCardClass}
      data-testid={`business-${listing.slug}`}
    >
      <Link href={salonHref} className={`block shrink-0 ${focusRingClass}`}>
        {listing.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- mixed local paths and owner-pasted http(s) URLs
          <img
            src={listing.coverImageUrl}
            alt={`${listing.name} cover`}
            width={800}
            height={400}
            loading="lazy"
            className="h-44 w-full object-cover sm:h-48"
            data-testid={`business-cover-${listing.slug}`}
          />
        ) : (
          <div className="flex h-44 items-end bg-emerald-50 px-4 py-3 sm:h-48">
            <span className="text-sm font-medium text-emerald-700/80">{listing.name}</span>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={salonHref} className={`inline-block rounded-sm ${focusRingClass}`}>
          <h2 className="text-lg font-semibold tracking-tight text-emerald-950 hover:text-emerald-800">
            {listing.name}
          </h2>
        </Link>

        {featuredService ? (
          <p className="mt-1 text-sm text-stone-600">
            From{" "}
            <span className="font-medium text-emerald-900">
              {formatPrice(featuredService.priceCents)}
            </span>
            {" · "}
            {featuredService.name}
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-500">No bookable services yet</p>
        )}

        {locations.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No active locations</p>
        ) : primaryLocation ? (
          <div className="mt-3 flex-1 text-sm text-zinc-600">
            <LocationHeading
              name={primaryLocation.name}
              isDefault={primaryLocation.isDefault}
              area={primaryLocation.area}
            />
            {primaryLocation.address ? (
              <span className="block text-zinc-500">{primaryLocation.address}</span>
            ) : null}
            {extraLocationCount > 0 ? (
              <p className="mt-1 text-xs text-zinc-500">
                +{extraLocationCount} more location{extraLocationCount === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4">
          <Link
            href={salonHref}
            className={discoveryButtonClass}
            data-testid={`book-now-${listing.slug}`}
          >
            View salon
          </Link>
        </div>
      </div>
    </article>
  );
}
