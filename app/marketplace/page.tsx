import Link from "next/link";
import { listPublishedOrganizations } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const organizations = await listPublishedOrganizations();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Marketplace</h1>
        <p className="text-sm text-zinc-600">
          Browse salons and book online. Pay at the salon when you arrive.
        </p>
      </div>

      {organizations.length === 0 ? (
        <p className="text-sm text-zinc-600">No salons are published yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {organizations.map((org) => (
            <li key={org.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="font-medium text-zinc-900">{org.name}</h2>
              {org.locations[0]?.address ? (
                <p className="mt-1 text-sm text-zinc-600">{org.locations[0].address}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/s/${org.slug}`}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 hover:bg-zinc-50"
                >
                  View salon
                </Link>
                <Link
                  href={`/s/${org.slug}/book`}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Book now
                </Link>
              </div>
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
