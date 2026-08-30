import Link from "next/link";

const links = [
  { href: "/dashboard/admin/categories", label: "Categories" },
  { href: "/dashboard/admin/services", label: "Services" },
  { href: "/dashboard/admin/staff", label: "Staff" },
];

export function AdminCatalogNav({ current }: { current: "categories" | "services" | "staff" }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
      <Link href="/dashboard/admin" className="hover:text-zinc-900">
        Admin
      </Link>
      <span aria-hidden="true">/</span>
      {links.map((link, index) => {
        const key = link.href.split("/").pop() as typeof current;
        const isCurrent = key === current;
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
