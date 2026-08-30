import Link from "next/link";
import { LocationHeading } from "@/components/booking/location-heading";
import { formatPrice } from "@/lib/format";
import type { MarketplaceListing } from "@/lib/marketplace";
import { primaryButtonClass, secondaryButtonClass, surfaceInteractiveClass } from "@/lib/ui";

export function BusinessCard({
  listing,
  serviceName,
}: {
  listing: MarketplaceListing;
  serviceName?: string;
}) {
  const { locations, featuredService, serviceCount } = listing;
  const salonHref = serviceName
    ? `/s/${listing.slug}?service=${encodeURIComponent(serviceName)}`
    : `/s/${listing.slug}`;

  return (
    <article
      className={`${surfaceInteractiveClass} flex h-full flex-col overflow-hidden`}
      data-testid={`business-${listing.slug}`}
    >
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
      <div className="flex flex-1 flex-col p-4">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{listing.name}</h2>

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
          <ul className="mt-3 flex-1 space-y-2">
            {locations.map((location) => (
              <li key={location.id} className="text-sm text-zinc-600">
                <LocationHeading
                  name={location.name}
                  isDefault={location.isDefault}
                  area={location.area}
                />
                {location.address ? (
                  <span className="block text-zinc-500">{location.address}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href={salonHref} className={secondaryButtonClass}>
            View salon
          </Link>
          <Link
            href={salonHref}
            className={primaryButtonClass}
            data-testid={`book-now-${listing.slug}`}
          >
            Book now
          </Link>
        </div>
      </div>
    </article>
  );
}
