import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          BeautyBook
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Salon booking, starting with sign-in
        </h1>
        <p className="text-zinc-600">
          Email and password login is ready. Use the demo account to continue.
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Log in
      </Link>
    </main>
  );
}
