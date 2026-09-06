"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navChipActiveClass, navChipClass } from "@/lib/ui";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/staff", label: "Staff" },
  { href: "/dashboard/book", label: "Book" },
  { href: "/dashboard/appointments", label: "Appointments" },
] as const;

function isDashboardNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (href === "/dashboard/admin") {
    return pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavLinks({ isOrgAdmin }: { isOrgAdmin: boolean }) {
  const pathname = usePathname();
  const adminCurrent = isDashboardNavActive(pathname, "/dashboard/admin");

  return (
    <nav className="-mx-4 mt-3 flex flex-nowrap items-center gap-1 overflow-x-auto px-4 pb-0.5 text-sm">
      {links.map((link) => {
        const current = isDashboardNavActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={current ? navChipActiveClass : navChipClass}
            aria-current={current ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
      <Link href="/" className={navChipClass}>
        Search
      </Link>
      {isOrgAdmin ? (
        <Link
          href="/dashboard/admin"
          className={adminCurrent ? navChipActiveClass : navChipClass}
          aria-current={adminCurrent ? "page" : undefined}
        >
          Admin
        </Link>
      ) : null}
    </nav>
  );
}
