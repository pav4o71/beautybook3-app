import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { getSession } from "@/lib/session";
import { secondaryButtonClass } from "@/lib/ui";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900">
          BeautyBook
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          {session?.user ? (
            <>
              <span className="hidden max-w-40 truncate text-zinc-600 sm:inline">
                {session.user.name}
              </span>
              <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-900">
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
