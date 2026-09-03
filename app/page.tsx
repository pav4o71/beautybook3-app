import { MarketplaceStickyCta } from "@/components/marketplace/marketplace-sticky-cta";
import { SiteHeader } from "@/components/site-header";
import {
  isQuickAvailabilityKey,
  type QuickAvailabilityKey,
} from "@/lib/availability/types";
import {
  quickAvailabilityFromQuery,
  resolveQuickAvailability,
} from "@/lib/availability/quick-filters";
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
    avail?: string;
  }>;
}) {
  const query = await searchParams;
  const categorySlug = query.category?.trim() || undefined;
  const serviceName = query.service?.trim() || undefined;
  const area = query.area && isManilaArea(query.area) ? query.area : undefined;
  const availParam = query.avail?.trim();
  const quickKey: QuickAvailabilityKey | undefined =
    availParam && isQuickAvailabilityKey(availParam)
      ? availParam
      : quickAvailabilityFromQuery({ avail: availParam });
  const quick = quickKey ? resolveQuickAvailability(quickKey) : null;

  const dateFromQuery = query.date ? parseSalonIsoDate(query.date) : null;
  const date = dateFromQuery ?? quick?.date ?? null;
  const timeRaw = query.time ?? quick?.time;
  const time =
    timeRaw && parseSalonTime(timeRaw) != null ? timeRaw : undefined;
  const serviceId = query.serviceId?.trim() || undefined;
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
      <main
        className={`mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 ${
          showSticky ? "pb-24 md:pb-10" : ""
        }`}
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            What would you like to book?
          </h1>
          <p className="text-sm text-zinc-600">
            Choose a service, compare salons and real availability, then book in a few
            taps. Pay at the salon when you arrive.
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
          avail={quickKey}
          minDate={minDate}
        />

        {activeCategory || serviceName || area || quick ? (
          <p className="text-sm text-zinc-600">
            Showing{" "}
            <span className="font-medium">
              {showAvailability ? "availability" : "salons"}
            </span>
            {activeCategory ? (
              <>
                {" "}
                for <span className="font-medium">{activeCategory.name}</span>
              </>
            ) : null}
            {serviceName ? (
              <>
                {" "}
                · <span className="font-medium">{serviceName}</span>
              </>
            ) : null}
            {area ? (
              <>
                {" "}
                in <span className="font-medium">{area}</span>
              </>
            ) : null}
            {quick ? (
              <>
                {" "}
                · <span className="font-medium">{quick.label}</span>
              </>
            ) : null}
          </p>
        ) : null}

        {showAvailability ? (
          <section id="availability-results" className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Available times
            </h2>
            <AvailabilityResults results={availability} />
          </section>
        ) : (
          <section id="salon-results" className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Salons</h2>
            <BusinessResults listings={listings} serviceName={serviceName} />
          </section>
        )}
      </main>
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
