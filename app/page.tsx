import { SiteHeader } from "@/components/site-header";
import { isManilaArea } from "@/lib/areas";
import { formatDay } from "@/lib/format";
import {
  listMarketplaceCategoryFilters,
  listMarketplaceOrganizations,
  listMarketplaceServiceChips,
  listMarketplaceServices,
  searchMarketplaceAvailability,
} from "@/lib/marketplace";
import { parseSalonIsoDate, parseSalonTime, salonIsoDate } from "@/lib/timezone";
import { pageLeadClass, pageMainClass, pageTitleClass, sectionTitleClass } from "@/lib/ui";
import { firstQueryValue } from "@/lib/validations/booking";
import { AvailabilityResults } from "./search/availability-results";
import { BusinessResults } from "./search/business-results";
import { SearchFilters } from "./search/search-filters";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string | string[];
    service?: string | string[];
    area?: string | string[];
    date?: string | string[];
    time?: string | string[];
    serviceId?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const categorySlug = firstQueryValue(query.category)?.trim() || undefined;
  const serviceName = firstQueryValue(query.service)?.trim() || undefined;
  const areaRaw = firstQueryValue(query.area)?.trim();
  const area = areaRaw && isManilaArea(areaRaw) ? areaRaw : undefined;
  const dateRaw = firstQueryValue(query.date)?.trim();
  const date = dateRaw ? parseSalonIsoDate(dateRaw) : null;
  const timeRaw = firstQueryValue(query.time)?.trim();
  const time = timeRaw && parseSalonTime(timeRaw) != null ? timeRaw : undefined;
  const serviceId = firstQueryValue(query.serviceId)?.trim() || undefined;
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
  const hasActiveFilters = Boolean(activeCategory || serviceName || area || date);

  return (
    <>
      <SiteHeader />
      <main className={`${pageMainClass} bg-linear-to-b from-stone-50/80 via-emerald-50/30 to-white`}>
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h1 className={`${pageTitleClass} text-emerald-950`}>Find a salon</h1>
          <p className={`${pageLeadClass} mx-auto text-stone-600`}>
            Browse hair and nail salons in Manila. Pick a service, then book a slot — pay
            at the salon when you arrive.
          </p>
          <div
            aria-hidden
            className="mx-auto flex max-w-xs items-center justify-center gap-2 pt-1"
          >
            <span className="h-px flex-1 bg-linear-to-r from-transparent to-emerald-300/70" />
            <span className="size-1.5 rotate-45 border border-emerald-400/80 bg-emerald-50" />
            <span className="h-px flex-1 bg-linear-to-l from-transparent to-emerald-300/70" />
          </div>
        </div>

        <section aria-labelledby="discovery-filters" className="space-y-3">
          <h2 id="discovery-filters" className="sr-only">
            Search filters
          </h2>
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
        </section>

        <section aria-labelledby="discovery-results" className="space-y-3">
          {hasActiveFilters ? (
            <p className="text-center text-sm text-stone-600">
              Showing{" "}
              {activeCategory ? (
                <>
                  <span className="font-medium text-emerald-950">{activeCategory.name}</span>{" "}
                </>
              ) : null}
              {date ? "availability" : "salons"}
              {serviceName ? (
                <>
                  {" "}
                  for <span className="font-medium text-emerald-950">{serviceName}</span>
                </>
              ) : null}
              {area ? (
                <>
                  {" "}
                  in <span className="font-medium text-emerald-950">{area}</span>
                </>
              ) : null}
              {date ? (
                <>
                  {" "}
                  on <span className="font-medium text-emerald-950">{formatDay(date)}</span>
                </>
              ) : null}
              {date && time ? (
                <>
                  {" "}
                  around <span className="font-medium text-emerald-950">{time}</span>
                </>
              ) : null}
            </p>
          ) : null}

          {date ? (
            <p className="text-center text-sm text-stone-600">
              Showing open times matching your filters.
            </p>
          ) : null}

          {date ? (
            <>
              <h2 id="discovery-results" className={`${sectionTitleClass} text-center text-emerald-950`}>
                Available times
              </h2>
              <AvailabilityResults results={availability} />
            </>
          ) : (
            <>
              <h2 id="discovery-results" className={`${sectionTitleClass} text-center text-emerald-950`}>
                Salons
              </h2>
              <BusinessResults listings={listings} serviceName={serviceName} />
            </>
          )}
        </section>
      </main>
    </>
  );
}
