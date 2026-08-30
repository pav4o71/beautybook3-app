import Link from "next/link";
import { LocationHeading } from "@/components/booking/location-heading";
import { formatPrice } from "@/lib/format";
import type { MarketplaceListing } from "@/lib/marketplace";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

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
      className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white"
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
          className="h-40 w-full object-cover"
          data-testid={`business-cover-${listing.slug}`}
        />
      ) : (
        <div className="h-40 bg-zinc-100" />
      )}
      <div className="flex flex-1 flex-col p-4">
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

        <div className="mt-4 flex flex-wrap gap-2">
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
