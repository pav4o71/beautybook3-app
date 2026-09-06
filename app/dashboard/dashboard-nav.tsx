import Link from "next/link";
import { resolveActiveOrganization, listUserMemberships } from "@/lib/org-context";
import { isOrgAdminRole } from "@/lib/org-roles";
import { requireUser } from "@/lib/require-user";
import { brandLinkClass, pageShellClass } from "@/lib/ui";
import { DashboardNavLinks } from "./dashboard-nav-links";
import { OrgSwitcher } from "./org-switcher";
import { LocationSwitcher } from "./location-switcher";
import { SignOutButton } from "./sign-out-button";

export async function DashboardNav() {
  const session = await requireUser();
  const memberships = await listUserMemberships(session.user.id);
  const active = await resolveActiveOrganization(session.user.id);

  const isLegacyAdmin = session.user.role === "ADMIN";
  const isOrgAdmin =
    isLegacyAdmin || (active ? isOrgAdminRole(active.membership.role) : false);

  const showContextRow =
    memberships.length > 0 || Boolean(active && active.locations.length > 0);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className={`${pageShellClass} py-3`}>
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className={`shrink-0 ${brandLinkClass}`}>
            BeautyBook
          </Link>
          <SignOutButton />
        </div>
        {showContextRow ? (
          <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
        ) : null}
        <DashboardNavLinks isOrgAdmin={isOrgAdmin} />
      </div>
    </header>
  );
}
