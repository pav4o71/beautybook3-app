import { AreaMarquee } from "@/components/motion/AreaMarquee";
import { HeroAtmosphere } from "@/components/motion/HeroAtmosphere";
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
import { pageLeadClass, pageMainClass, sectionTitleClass } from "@/lib/ui";
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
      <main className={pageMainClass}>
        <HeroAtmosphere>
          <p className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            BeautyBook
          </p>
          <h1 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-xl font-medium tracking-tight text-stone-800 sm:text-2xl">
            Find a salon
          </h1>
          <p className={`${pageLeadClass} mt-2 text-stone-600`}>
            Browse hair and nail salons in Manila. Pick a service, then book a slot — pay at
            the salon when you arrive.
          </p>
          <div className="mt-6">
            <AreaMarquee />
          </div>
        </HeroAtmosphere>

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
            <p className="text-sm text-zinc-600">
              Showing{" "}
              {activeCategory ? (
                <>
                  <span className="font-medium text-zinc-900">{activeCategory.name}</span>{" "}
                </>
              ) : null}
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
              {date ? (
                <>
                  {" "}
                  on <span className="font-medium text-zinc-900">{formatDay(date)}</span>
                </>
              ) : null}
              {date && time ? (
                <>
                  {" "}
                  around <span className="font-medium text-zinc-900">{time}</span>
                </>
              ) : null}
            </p>
          ) : null}

          {date ? (
            <p className="text-sm text-zinc-600">
              Showing open times matching your filters.
            </p>
          ) : null}

          {date ? (
            <>
              <h2 id="discovery-results" className={sectionTitleClass}>
                Available times
              </h2>
              <AvailabilityResults results={availability} />
            </>
          ) : (
            <>
              <h2 id="discovery-results" className={sectionTitleClass}>
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
