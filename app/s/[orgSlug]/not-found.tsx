import Link from "next/link";
import { pageMainClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export default function SalonNotFound() {
  return (
    <main className={`${pageMainClass} items-start justify-center`}>
      <div className="w-full max-w-md space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Salon</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          This salon is not listed
        </h1>
        <p className="text-sm text-zinc-600">
          The link may be outdated, or the business has not published a storefront yet.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className={primaryButtonClass}>
            Browse salons
          </Link>
          <Link href="/login" className={secondaryButtonClass}>
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
