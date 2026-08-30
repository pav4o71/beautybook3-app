import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          BeautyBook
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Salon booking for customers and businesses
        </h1>
        <p className="text-zinc-600">
          Browse salons, book online, or sign in to manage your business.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/marketplace"
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Browse marketplace
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
