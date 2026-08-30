import { isManilaArea } from "@/lib/areas";
import {
  listMarketplaceCategoryFilters,
  listMarketplaceOrganizations,
  listMarketplaceServiceChips,
  listMarketplaceServices,
  searchMarketplaceAvailability,
} from "@/lib/marketplace";
import { parseSalonIsoDate, parseSalonTime, salonIsoDate } from "@/lib/timezone";
import { AvailabilityResults } from "./search/availability-results";
import { BusinessResults } from "./search/business-results";
import { SearchFilters } from "./search/search-filters";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    service?: string;
    area?: string;
    date?: string;
    time?: string;
    serviceId?: string;
  }>;
}) {
  const query = await searchParams;
  const categorySlug = query.category?.trim() || undefined;
  const serviceName = query.service?.trim() || undefined;
  const area = query.area && isManilaArea(query.area) ? query.area : undefined;
  const date = query.date ? parseSalonIsoDate(query.date) : null;
  const time = query.time && parseSalonTime(query.time) != null ? query.time : undefined;
  const serviceId = query.serviceId?.trim() || undefined;
  const minDate = salonIsoDate();

  const [categories, services, listings, availability] = await Promise.all([
    listMarketplaceCategoryFilters(),
    listMarketplaceServices({ categorySlug, area }),
    date
      ? Promise.resolve([])
      : listMarketplaceOrganizations({ categorySlug, area, serviceName }),
    date
      ? searchMarketplaceAvailability({
          categorySlug,
          serviceId,
          serviceName,
          area,
          date,
          time,
        })
      : Promise.resolve([]),
  ]);

  const serviceChips = listMarketplaceServiceChips(services);
  const activeCategory = categorySlug
    ? categories.find((category) => category.slug === categorySlug)
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Search</h1>
        <p className="text-sm text-zinc-600">
          Pick a category and service, then choose a salon. Add a day to see real staff
          availability.
        </p>
      </div>

      <SearchFilters
        categories={categories}
        services={serviceChips}
        activeSlug={activeCategory?.slug}
        activeService={serviceName}
        serviceId={serviceId}
        area={area}
        date={date ? salonIsoDate(date) : undefined}
        time={time}
        minDate={minDate}
      />

      {activeCategory ? (
        <p className="text-sm text-zinc-600">
          Showing <span className="font-medium">{activeCategory.name}</span>{" "}
          {date ? "availability" : "salons"}
          {serviceName ? (
            <>
              {" "}
              for <span className="font-medium">{serviceName}</span>
            </>
          ) : null}
          {area ? (
            <>
              {" "}
              in <span className="font-medium">{area}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {date ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            Available times
          </h2>
          <AvailabilityResults results={availability} />
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Salons</h2>
          <BusinessResults listings={listings} serviceName={serviceName} />
        </section>
      )}
    </main>
  );
}
