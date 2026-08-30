import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { MarketplaceServiceResult } from "@/lib/marketplace";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export function ServiceResults({ services }: { services: MarketplaceServiceResult[] }) {
  if (services.length === 0) {
    return (
      <p className="text-sm text-zinc-600">No services match these filters yet.</p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {services.map((service) => {
        const location = service.locations[0];
        const bookParams = new URLSearchParams({ serviceId: service.id });
        if (location) bookParams.set("locationId", location.id);
        const areas = [
          ...new Set(service.locations.map((item) => item.area).filter(Boolean)),
        ];

        return (
          <li key={service.id}>
            <article
              className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-4"
              data-testid={`service-result-${service.id}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {service.categoryName}
              </p>
              <h2 className="mt-1 font-medium text-zinc-900">{service.name}</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {service.organization.name}
                {areas.length > 0 ? ` · ${areas.join(", ")}` : ""}
              </p>
              <p className="mt-1 text-sm text-zinc-900">
                {formatPrice(service.priceCents)}
                <span className="ml-2 text-xs text-zinc-500">{service.durationMin} min</span>
              </p>
              {location ? (
                <p className="mt-1 text-xs text-zinc-500">{location.name}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/s/${service.organization.slug}`}
                  className={secondaryButtonClass}
                >
                  View salon
                </Link>
                <Link
                  href={`/s/${service.organization.slug}/book?${bookParams.toString()}`}
                  className={primaryButtonClass}
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
