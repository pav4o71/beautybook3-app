import Link from "next/link";
import { navChipActiveClass, navChipClass } from "@/lib/ui";

const links = [
  { href: "/dashboard/admin/appointments", label: "Appointments", key: "appointments" },
  { href: "/dashboard/admin/locations", label: "Locations", key: "locations" },
  { href: "/dashboard/admin/categories", label: "Categories", key: "categories" },
  { href: "/dashboard/admin/services", label: "Services", key: "services" },
  { href: "/dashboard/admin/staff", label: "Staff", key: "staff" },
  { href: "/dashboard/admin/settings", label: "Settings", key: "settings" },
] as const;

export type AdminNavSection = (typeof links)[number]["key"];

export function AdminNav({ current }: { current?: AdminNavSection }) {
  return (
    <nav className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:px-0">
      <Link
        href="/dashboard/admin"
        className={current ? navChipClass : navChipActiveClass}
      >
        Admin
      </Link>
      {links.map((link) => {
        const isCurrent = link.key === current;
        return isCurrent ? (
          <span key={link.href} className={navChipActiveClass}>
            {link.label}
          </span>
        ) : (
          <Link key={link.href} href={link.href} className={navChipClass}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
