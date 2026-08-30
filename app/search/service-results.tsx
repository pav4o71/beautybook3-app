import Link from "next/link";
import { ServiceCard } from "@/components/booking/ServiceCard";
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
            <ServiceCard
              service={service}
              salonName={service.organization.name}
              areaLabel={areas.join(", ") || undefined}
              testId={`service-result-${service.id}`}
              footer={
                <div className="mt-4 flex flex-wrap gap-2">
                  {location ? (
                    <p className="w-full text-xs text-zinc-500">{location.name}</p>
                  ) : null}
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
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
