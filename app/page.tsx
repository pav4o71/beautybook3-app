import Link from "next/link";
import { CategoryCard } from "@/components/booking/CategoryCard";
import { listMarketplaceCategoryFilters } from "@/lib/marketplace";
import { secondaryButtonClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const categories = await listMarketplaceCategoryFilters();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-8 px-4 py-16">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          BeautyBook
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Find a salon service in Manila
        </h1>
        <p className="text-zinc-600">
          Pick a category to see prices across salons, then filter by area and book online.
        </p>
      </div>

      <section className="w-full max-w-2xl space-y-3">
        <h2 className="text-center text-sm font-medium text-zinc-900">
          What are you looking for?
        </h2>
        {categories.length === 0 ? (
          <p className="text-center text-sm text-zinc-600">
            No published salon services yet.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <CategoryCard
                  category={category}
                  href={`/search?category=${category.slug}`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/search" className={secondaryButtonClass}>
          Browse all services
        </Link>
        <Link href="/login" className={secondaryButtonClass}>
          Log in
        </Link>
      </div>
    </main>
  );
}
