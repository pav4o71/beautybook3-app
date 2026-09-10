import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { getSession } from "@/lib/session";
import { brandLinkClass, pageShellClass, secondaryButtonClass, textLinkClass } from "@/lib/ui";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="border-b border-emerald-100/80 bg-white/90 backdrop-blur-xs">
      <div className={`${pageShellClass} flex items-center justify-between gap-3 py-3`}>
        <Link href="/" className={`${brandLinkClass} text-emerald-950 hover:text-emerald-800`}>
          BeautyBook
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          {session?.user ? (
            <>
              <span className="hidden max-w-40 truncate text-zinc-600 sm:inline">
                {session.user.name}
              </span>
              {/* Org members see Dashboard; customers see Account */}
              <Link href="/dashboard" className={textLinkClass}>
                Dashboard
              </Link>
              <Link href="/account" className={textLinkClass}>
                My account
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className={textLinkClass}
              >
                Create account
              </Link>
              <Link
                href="/login"
                className={`${secondaryButtonClass} border-emerald-200 text-emerald-900 hover:bg-emerald-50`}
              >
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
