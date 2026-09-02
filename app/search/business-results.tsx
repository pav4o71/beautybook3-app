import { EmptyState } from "@/components/empty-state";
import { BusinessCard } from "@/components/booking/BusinessCard";
import type { MarketplaceListing } from "@/lib/marketplace";
import { secondaryButtonClass } from "@/lib/ui";
import Link from "next/link";

export function BusinessResults({
  listings,
  serviceName,
}: {
  listings: MarketplaceListing[];
  serviceName?: string;
}) {
  if (listings.length === 0) {
    return (
      <div className="py-4 sm:py-6">
        <EmptyState
          title="No salons match these filters"
          description="Try another category, service, or area."
        >
          <Link href="/" className={secondaryButtonClass}>
            Clear filters
          </Link>
        </EmptyState>
      </div>
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
