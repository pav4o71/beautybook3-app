import Link from "next/link";
import type { MarketplaceCategoryFilter } from "@/lib/marketplace";

function filterLinkClass(active: boolean) {
  return active
    ? "rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white"
    : "rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50";
}

export function MarketplaceCategoryFilter({
  categories,
  activeSlug,
}: {
  categories: MarketplaceCategoryFilter[];
  activeSlug?: string;
}) {
  return (
    <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
      <Link
        href="/marketplace"
        className={filterLinkClass(!activeSlug)}
        data-testid="category-all"
      >
        All salons
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/marketplace?category=${category.slug}`}
          className={filterLinkClass(activeSlug === category.slug)}
          data-testid={`category-${category.slug}`}
        >
          {category.name}
          <span className="ml-1 text-xs opacity-80">({category.salonCount})</span>
        </Link>
      ))}
    </nav>
  );
}
