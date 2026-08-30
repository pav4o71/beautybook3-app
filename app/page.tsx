import { SiteHeader } from "@/components/site-header";
import { isManilaArea } from "@/lib/areas";
import {
  listMarketplaceCategoryFilters,
  listMarketplaceOrganizations,
  listMarketplaceServiceChips,
  listMarketplaceServices,
  searchMarketplaceAvailability,
} from "@/lib/marketplace";
import { parseSalonIsoDate, parseSalonTime, salonIsoDate } from "@/lib/timezone";
import { pageLeadClass, pageMainClass, pageTitleClass, sectionTitleClass } from "@/lib/ui";
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
    <>
      <SiteHeader />
      <main className={pageMainClass}>
        <div className="space-y-2">
          <h1 className={pageTitleClass}>Find a salon</h1>
          <p className={pageLeadClass}>
            Browse hair and nail salons in Manila. Pick a service, then book a slot — pay
            at the salon when you arrive.
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
            Showing <span className="font-medium text-zinc-900">{activeCategory.name}</span>{" "}
            {date ? "availability" : "salons"}
            {serviceName ? (
              <>
                {" "}
                for <span className="font-medium text-zinc-900">{serviceName}</span>
              </>
            ) : null}
            {area ? (
              <>
                {" "}
                in <span className="font-medium text-zinc-900">{area}</span>
              </>
            ) : null}
          </p>
        ) : null}

        {date ? (
          <section className="space-y-3">
            <h2 className={sectionTitleClass}>Available times</h2>
            <AvailabilityResults results={availability} />
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className={sectionTitleClass}>Salons</h2>
            <BusinessResults listings={listings} serviceName={serviceName} />
          </section>
        )}
      </main>
    </>
  );
}
