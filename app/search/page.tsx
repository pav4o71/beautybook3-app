import {
  listMarketplaceCategoryFilters,
  listMarketplaceServices,
} from "@/lib/marketplace";
import { isManilaArea } from "@/lib/areas";
import { SearchFilters } from "./search-filters";
import { ServiceResults } from "./service-results";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; area?: string }>;
}) {
  const query = await searchParams;
  const categorySlug = query.category?.trim() || undefined;
  const area = query.area && isManilaArea(query.area) ? query.area : undefined;

  const [categories, services] = await Promise.all([
    listMarketplaceCategoryFilters(),
    listMarketplaceServices({ categorySlug, area }),
  ]);

  const activeCategory = categorySlug
    ? categories.find((category) => category.slug === categorySlug)
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Search</h1>
        <p className="text-sm text-zinc-600">
          Find a service across Manila salons, then book online. Pay at the salon when you
          arrive.
        </p>
      </div>

      <SearchFilters
        categories={categories}
        activeSlug={activeCategory?.slug}
        area={area}
      />

      {activeCategory ? (
        <p className="text-sm text-zinc-600">
          Showing <span className="font-medium">{activeCategory.name}</span> services
          {area ? (
            <>
              {" "}
              in <span className="font-medium">{area}</span>
            </>
          ) : null}
        </p>
      ) : area ? (
        <p className="text-sm text-zinc-600">
          Showing services in <span className="font-medium">{area}</span>
        </p>
      ) : null}

      <ServiceResults services={services} />
    </main>
  );
}
