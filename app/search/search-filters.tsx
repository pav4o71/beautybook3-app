"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AreaFilter } from "@/components/booking/AreaFilter";
import type { MarketplaceCategoryFilter } from "@/lib/marketplace";

function searchHref(category?: string, area?: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (area) params.set("area", area);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

function filterLinkClass(active: boolean) {
  return active
    ? "rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white"
    : "rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50";
}

export function SearchFilters({
  categories,
  activeSlug,
  area,
}: {
  categories: MarketplaceCategoryFilter[];
  activeSlug?: string;
  area?: string;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
        <Link
          href={searchHref(undefined, area)}
          className={filterLinkClass(!activeSlug)}
          data-testid="category-all"
        >
          All services
        </Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={searchHref(category.slug, area)}
            className={filterLinkClass(activeSlug === category.slug)}
            data-testid={`category-${category.slug}`}
          >
            {category.name}
            <span className="ml-1 text-xs opacity-80">({category.salonCount})</span>
          </Link>
        ))}
      </nav>
      <AreaFilter
        selectedArea={area ?? ""}
        onAreaChange={(nextArea) => {
          router.push(searchHref(activeSlug, nextArea || undefined));
        }}
      />
    </div>
  );
}
