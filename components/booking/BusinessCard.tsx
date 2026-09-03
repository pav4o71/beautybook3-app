import Link from "next/link";
import { AvailabilityBadge } from "@/components/marketplace/availability-badge";
import { TrustSignalRow } from "@/components/marketplace/trust-signal-row";
import { LocationHeading } from "@/components/booking/location-heading";
import { formatPrice } from "@/lib/format";
import type { MarketplaceListing } from "@/lib/marketplace";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

function focusRingClass(base: string) {
  return `${base} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900`;
}

export function BusinessCard({
  listing,
  serviceName,
}: {
  listing: MarketplaceListing;
  serviceName?: string;
}) {
  const { locations, featuredService, serviceCount } = listing;
  const viewHref = serviceName
    ? `/s/${listing.slug}?service=${encodeURIComponent(serviceName)}`
    : `/s/${listing.slug}`;

  const bookServiceId =
    listing.nextAvailability?.kind === "slot"
      ? listing.nextAvailability.serviceId
      : featuredService?.id;
  const bookHref = bookServiceId
    ? `/s/${listing.slug}/book?serviceId=${encodeURIComponent(bookServiceId)}`
    : `/s/${listing.slug}#services`;

  const visibleLocations = locations.slice(0, 2);
  const extraLocationCount = locations.length - visibleLocations.length;

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-zinc-300 focus-within:border-zinc-400"
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
          className="aspect-[2/1] h-auto w-full object-cover"
          data-testid={`business-cover-${listing.slug}`}
        />
      ) : (
        <div className="aspect-[2/1] bg-zinc-100" aria-hidden="true" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 font-medium text-zinc-900">{listing.name}</h2>

        <TrustSignalRow trust={listing.trust} />

        <AvailabilityBadge value={listing.nextAvailability} />

        {featuredService ? (
          <p className="text-sm text-zinc-600">
            From{" "}
            <span className="font-medium text-zinc-900">
              {formatPrice(featuredService.priceCents)}
            </span>
            {" · "}
            <span className="line-clamp-1">{featuredService.name}</span>
          </p>
        ) : (
          <p className="text-sm text-zinc-500">No bookable services yet</p>
        )}

        <p className="text-xs text-zinc-500">
          {serviceCount} active service{serviceCount === 1 ? "" : "s"}
        </p>

        {locations.length === 0 ? (
          <p className="text-sm text-zinc-500">No active locations</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {visibleLocations.map((location) => (
              <li key={location.id} className="text-sm text-zinc-600">
                <LocationHeading
                  name={location.name}
                  isDefault={location.isDefault}
                  area={location.area}
                />
                {location.address ? (
                  <span className="line-clamp-1 block text-zinc-500">{location.address}</span>
                ) : null}
              </li>
            ))}
            {extraLocationCount > 0 ? (
              <li className="text-xs text-zinc-500">
                +{extraLocationCount} more location{extraLocationCount === 1 ? "" : "s"}
              </li>
            ) : null}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link href={viewHref} className={focusRingClass(secondaryButtonClass)}>
            View salon
          </Link>
          <Link
            href={bookHref}
            className={focusRingClass(primaryButtonClass)}
            data-testid={`book-now-${listing.slug}`}
          >
            Book now
          </Link>
        </div>
      </div>
    </article>
  );
}
