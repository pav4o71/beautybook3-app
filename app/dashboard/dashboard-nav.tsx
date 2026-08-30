import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { SignOutButton } from "./sign-out-button";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/staff", label: "Staff" },
  { href: "/dashboard/book", label: "Book" },
  { href: "/dashboard/appointments", label: "Appointments" },
];

export async function DashboardNav() {
  const session = await requireUser();
  const isAdmin = session.user.role === "ADMIN";

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-zinc-900">
          BeautyBook
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-zinc-600 hover:text-zinc-900"
            >
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              href="/dashboard/admin"
              className="font-medium text-zinc-900 hover:text-zinc-700"
            >
              Admin
            </Link>
          ) : null}
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
