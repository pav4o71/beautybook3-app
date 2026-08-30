import Link from "next/link";

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
    <nav className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
      <Link href="/dashboard/admin" className="hover:text-zinc-900">
        Admin
      </Link>
      <span aria-hidden="true">/</span>
      {links.map((link, index) => {
        const isCurrent = link.key === current;
        return (
          <span key={link.href} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">·</span> : null}
            {isCurrent ? (
              <span className="font-medium text-zinc-900">{link.label}</span>
            ) : (
              <Link href={link.href} className="hover:text-zinc-900">
                {link.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
