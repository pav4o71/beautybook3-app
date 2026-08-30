import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { getSession } from "@/lib/session";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900">
          BeautyBook
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          {session?.user ? (
            <>
              <span className="text-zinc-600">{session.user.name}</span>
              <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-900">
                Dashboard
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/login" className="text-zinc-600 hover:text-zinc-900">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
