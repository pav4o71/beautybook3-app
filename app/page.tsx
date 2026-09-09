import { MarketplaceStickyCta } from "@/components/marketplace/marketplace-sticky-cta";
import { SiteHeader } from "@/components/site-header";
import { isQuickAvailabilityKey } from "@/lib/availability/types";
import { resolveQuickAvailability } from "@/lib/availability/quick-filters";
import { isManilaArea } from "@/lib/areas";
import {
  listMarketplaceCategoryFilters,
  listMarketplaceOrganizations,
  listMarketplaceServiceChips,
  listMarketplaceServices,
  searchMarketplaceAvailability,
  searchMarketplaceAvailabilityAcrossDates,
} from "@/lib/marketplace";
import { parseSalonIsoDate, parseSalonTime, salonIsoDate } from "@/lib/timezone";
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
    avail?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const categorySlug = firstQueryValue(query.category)?.trim() || undefined;
  const serviceName = firstQueryValue(query.service)?.trim() || undefined;
  const areaRaw = firstQueryValue(query.area)?.trim();
  const area = areaRaw && isManilaArea(areaRaw) ? areaRaw : undefined;
  const availParam = firstQueryValue(query.avail)?.trim();
  const quickKey =
    availParam && isQuickAvailabilityKey(availParam) ? availParam : undefined;
  const quick = quickKey ? resolveQuickAvailability(quickKey) : null;

  const dateRaw = firstQueryValue(query.date)?.trim();
  const dateFromQuery = dateRaw ? parseSalonIsoDate(dateRaw) : null;
  const date = dateFromQuery ?? quick?.date ?? null;
  const timeRaw = firstQueryValue(query.time)?.trim() ?? quick?.time;
  const time =
    timeRaw && parseSalonTime(timeRaw) != null ? timeRaw : undefined;
  const serviceId = firstQueryValue(query.serviceId)?.trim() || undefined;
  const minDate = salonIsoDate();

  const multiDates = quick?.dates;
  const showAvailability =
    Boolean(date) || Boolean(multiDates && multiDates.length > 0);

  const [categories, services, listings, availability] = await Promise.all([
    listMarketplaceCategoryFilters(),
    listMarketplaceServices({ categorySlug, area }),
    showAvailability
      ? Promise.resolve([])
      : listMarketplaceOrganizations({ categorySlug, area, serviceName }),
    showAvailability
      ? multiDates && multiDates.length > 0
        ? searchMarketplaceAvailabilityAcrossDates({
            categorySlug,
            serviceId,
            serviceName,
            area,
            dates: multiDates,
            time,
            stopOnFirstDayWithResults: quickKey === "earliest",
          })
        : date
          ? searchMarketplaceAvailability({
              categorySlug,
              serviceId,
              serviceName,
              area,
              date,
              time,
            })
          : Promise.resolve([])
      : Promise.resolve([]),
  ]);

  const serviceChips = listMarketplaceServiceChips(services);
  const activeCategory = categorySlug
    ? categories.find((category) => category.slug === categorySlug)
    : undefined;

  const stickyLabel = serviceName
    ? `Book ${serviceName}`
    : activeCategory
      ? `Browse ${activeCategory.name}`
      : "Find a salon";
  const stickyHref = showAvailability
    ? "#availability-results"
    : "#salon-results";
  const showSticky = Boolean(categorySlug || serviceName);

  return (
    <>
      <SiteHeader />
      <div className="bg-gradient-to-b from-stone-50/80 via-emerald-50/20 to-white">
        <main
          className={`mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:py-12 ${
            showSticky ? "pb-24 md:pb-12" : ""
          }`}
        >
          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 sm:text-3xl">
              What would you like to book?
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
              Choose a service, compare salons and real availability, then book in a few
              taps. Pay at the salon when you arrive.
            </p>
            <div
              aria-hidden
              className="mx-auto flex max-w-xs items-center justify-center gap-2 pt-1"
            >
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-emerald-300/70" />
              <span className="size-1.5 rotate-45 border border-emerald-400/80 bg-emerald-50" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-emerald-300/70" />
            </div>
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
            avail={quickKey}
            minDate={minDate}
          />

          {activeCategory || serviceName || area || quick ? (
            <p className="text-center text-sm text-stone-600">
              Showing{" "}
              <span className="font-medium text-emerald-950">
                {showAvailability ? "availability" : "salons"}
              </span>
              {activeCategory ? (
                <>
                  {" "}
                  for <span className="font-medium text-emerald-950">{activeCategory.name}</span>
                </>
              ) : null}
              {serviceName ? (
                <>
                  {" "}
                  · <span className="font-medium text-emerald-950">{serviceName}</span>
                </>
              ) : null}
              {area ? (
                <>
                  {" "}
                  in <span className="font-medium text-emerald-950">{area}</span>
                </>
              ) : null}
              {quick ? (
                <>
                  {" "}
                  · <span className="font-medium text-emerald-950">{quick.label}</span>
                </>
              ) : null}
            </p>
          ) : null}

          {showAvailability ? (
            <section id="availability-results" className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-emerald-950">
                Available times
              </h2>
              <AvailabilityResults results={availability} />
            </section>
          ) : (
            <section id="salon-results" className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-emerald-950">Salons</h2>
              <BusinessResults listings={listings} serviceName={serviceName} />
            </section>
          )}
        </main>
      </div>
      {showSticky ? (
        <MarketplaceStickyCta
          href={stickyHref}
          label={stickyLabel}
          hint="Scroll to matching results"
        />
      ) : null}
    </>
  );
}
