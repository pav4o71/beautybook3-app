import { BusinessCard } from "@/components/booking/BusinessCard";
import type { MarketplaceListing } from "@/lib/marketplace";

export function BusinessResults({
  listings,
  serviceName,
}: {
  listings: MarketplaceListing[];
  serviceName?: string;
}) {
  if (listings.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No salons match these filters. Try another category, service, or area.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {listings.map((listing) => (
        <li key={listing.id}>
          <BusinessCard listing={listing} serviceName={serviceName} />
        </li>
      ))}
    </ul>
  );
}
