import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { getSession } from "@/lib/session";
import { brandLinkClass, pageShellClass, secondaryButtonClass, textLinkClass } from "@/lib/ui";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className={`${pageShellClass} flex items-center justify-between gap-3 py-3`}>
        <Link href="/" className={brandLinkClass}>
          BeautyBook
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
