import Link from "next/link";
import { BusinessCard } from "@/components/booking/BusinessCard";
import {
  listMarketplaceCategoryFilters,
  listMarketplaceOrganizations,
} from "@/lib/marketplace";
import { MarketplaceCategoryFilter } from "./category-filter";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categorySlug } = await searchParams;
  const [categories, organizations] = await Promise.all([
    listMarketplaceCategoryFilters(),
    listMarketplaceOrganizations(categorySlug),
  ]);

  const activeCategory = categorySlug
    ? categories.find((category) => category.slug === categorySlug)
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Marketplace
        </h1>
        <p className="text-sm text-zinc-600">
          Browse salons and book online. Pay at the salon when you arrive.
        </p>
      </div>

      <MarketplaceCategoryFilter
        categories={categories}
        activeSlug={activeCategory?.slug}
      />

      {activeCategory ? (
        <p className="text-sm text-zinc-600">
          Showing salons with <span className="font-medium">{activeCategory.name}</span>{" "}
          services
        </p>
      ) : null}

      {organizations.length === 0 ? (
        <p className="text-sm text-zinc-600">
          {activeCategory
            ? `No salons offer ${activeCategory.name.toLowerCase()} services yet.`
            : "No salons are published yet."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {organizations.map((listing) => (
            <li key={listing.id}>
              <BusinessCard listing={listing} />
            </li>
          ))}
        </ul>
      )}

      <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900">
        Sign in to manage your business
      </Link>
    </main>
  );
}
