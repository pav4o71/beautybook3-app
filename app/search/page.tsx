import { isManilaArea } from "@/lib/areas";
import {
  listMarketplaceCategoryFilters,
  listMarketplaceServices,
  searchMarketplaceAvailability,
} from "@/lib/marketplace";
import { parseSalonIsoDate, parseSalonTime, salonIsoDate } from "@/lib/timezone";
import { AvailabilityResults } from "./availability-results";
import { SearchFilters } from "./search-filters";
import { ServiceResults } from "./service-results";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    area?: string;
    date?: string;
    time?: string;
    serviceId?: string;
  }>;
}) {
  const query = await searchParams;
  const categorySlug = query.category?.trim() || undefined;
  const area = query.area && isManilaArea(query.area) ? query.area : undefined;
  const date = query.date ? parseSalonIsoDate(query.date) : null;
  const time = query.time && parseSalonTime(query.time) != null ? query.time : undefined;
  const serviceId = query.serviceId?.trim() || undefined;
  const minDate = salonIsoDate();

  const [categories, services, availability] = await Promise.all([
    listMarketplaceCategoryFilters(),
    date
      ? Promise.resolve([])
      : listMarketplaceServices({ categorySlug, area }),
    date
      ? searchMarketplaceAvailability({
          categorySlug,
          serviceId,
          area,
          date,
          time,
        })
      : Promise.resolve([]),
  ]);

  const activeCategory = categorySlug
    ? categories.find((category) => category.slug === categorySlug)
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Search</h1>
        <p className="text-sm text-zinc-600">
          Find a service across Manila salons, then pick a day to see real staff availability.
        </p>
      </div>

      <SearchFilters
        categories={categories}
        activeSlug={activeCategory?.slug}
        area={area}
        date={date ? salonIsoDate(date) : undefined}
        time={time}
        minDate={minDate}
      />

      {activeCategory ? (
        <p className="text-sm text-zinc-600">
          Showing <span className="font-medium">{activeCategory.name}</span>{" "}
          {date ? "availability" : "services"}
          {area ? (
            <>
              {" "}
              in <span className="font-medium">{area}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {date ? (
        <AvailabilityResults results={availability} />
      ) : (
        <ServiceResults services={services} />
      )}
    </main>
  );
}