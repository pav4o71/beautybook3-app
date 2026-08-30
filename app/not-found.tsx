import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { pageMainClass, primaryButtonClass } from "@/lib/ui";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className={`${pageMainClass} items-start justify-center`}>
        <div className="w-full max-w-md space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">404</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Page not found
          </h1>
          <p className="text-sm text-zinc-600">
            That page does not exist, or this salon is not listed right now.
          </p>
          <Link href="/" className={primaryButtonClass}>
            Browse salons
          </Link>
        </div>
      </main>
    </>
  );
}
