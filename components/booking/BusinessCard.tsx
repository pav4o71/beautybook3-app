import Link from "next/link";
import { LocationHeading } from "@/components/booking/location-heading";
import { formatPrice } from "@/lib/format";
import type { MarketplaceListing } from "@/lib/marketplace";
import { focusRingClass, primaryButtonClass, surfaceInteractiveClass } from "@/lib/ui";

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
      className={`${surfaceInteractiveClass} flex h-full flex-col overflow-hidden`}
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
          <div className="flex h-44 items-end bg-zinc-100 px-4 py-3 sm:h-48">
            <span className="text-sm font-medium text-zinc-500">{listing.name}</span>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={salonHref} className={`inline-block rounded-sm ${focusRingClass}`}>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 hover:text-zinc-700">
            {listing.name}
          </h2>
        </Link>

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
            className={primaryButtonClass}
            data-testid={`book-now-${listing.slug}`}
          >
            View salon
          </Link>
        </div>
      </div>
    </article>
  );
}
