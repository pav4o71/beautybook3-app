import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { BrandShimmer } from "@/components/motion/BrandShimmer";
import { getSession } from "@/lib/session";
import { brandLinkClass, pageShellClass, secondaryButtonClass, textLinkClass } from "@/lib/ui";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-rose-100/80 bg-[color-mix(in_srgb,var(--background)_88%,white)] backdrop-blur-md">
      <div className={`${pageShellClass} flex items-center justify-between gap-3 py-3`}>
        <Link href="/" className={`${brandLinkClass} font-[family-name:var(--font-display)] text-base tracking-tight`}>
          <BrandShimmer>BeautyBook</BrandShimmer>
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          {session?.user ? (
            <>
              <span className="hidden max-w-40 truncate text-zinc-600 sm:inline">
                {session.user.name}
              </span>
              <Link href="/dashboard" className={textLinkClass}>
                Dashboard
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/login" className={secondaryButtonClass}>
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
