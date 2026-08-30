import Link from "next/link";
import { resolveActiveOrganization, listUserMemberships } from "@/lib/org-context";
import { isOrgAdminRole } from "@/lib/org-roles";
import { requireUser } from "@/lib/require-user";
import { navChipClass } from "@/lib/ui";
import { OrgSwitcher } from "./org-switcher";
import { LocationSwitcher } from "./location-switcher";
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
  const memberships = await listUserMemberships(session.user.id);
  const active = await resolveActiveOrganization(session.user.id);

  const isLegacyAdmin = session.user.role === "ADMIN";
  const isOrgAdmin =
    isLegacyAdmin || (active ? isOrgAdminRole(active.membership.role) : false);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="shrink-0 text-sm font-semibold tracking-tight text-zinc-900"
            >
              BeautyBook
            </Link>
            <OrgSwitcher
              memberships={memberships}
              activeOrgId={active?.organization.id ?? ""}
            />
            {active && active.locations.length > 0 ? (
              <LocationSwitcher
                locations={active.locations.map((location) => ({
                  id: location.id,
                  name: location.name,
                }))}
                activeLocationId={active.location?.id ?? active.locations[0].id}
              />
            ) : null}
          </div>
          <SignOutButton />
        </div>
        <nav className="-mx-4 mt-3 flex flex-nowrap items-center gap-1 overflow-x-auto px-4 pb-0.5 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={navChipClass}>
              {link.label}
            </Link>
          ))}
          <Link href="/" className={navChipClass}>
            Search
          </Link>
          {isOrgAdmin ? (
            <Link
              href="/dashboard/admin"
              className={`${navChipClass} font-medium text-zinc-900`}
            >
              Admin
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
