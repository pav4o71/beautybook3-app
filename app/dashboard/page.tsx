import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { resolveActiveOrganization } from "@/lib/org-context";
import { isOrgAdminRole } from "@/lib/org-roles";
import { requireUser } from "@/lib/require-user";
import { focusRingClass, pageMainClass, surfaceInteractiveClass } from "@/lib/ui";

export default async function DashboardPage() {
  const session = await requireUser();
  const active = await resolveActiveOrganization(session.user.id);
  const isOrgAdmin =
    session.user.role === "ADMIN" ||
    (active ? isOrgAdminRole(active.membership.role) : false);

  return (
    <main className={pageMainClass}>
      <PageHeader
        title="Dashboard"
        lead={`Signed in as ${session.user.name}${active ? ` · ${active.organization.name} (${active.membership.role})` : ""}.`}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/services"
          className={`${surfaceInteractiveClass} block p-4 ${focusRingClass}`}
        >
          <h2 className="font-medium text-zinc-900">Services</h2>
          <p className="mt-1 text-sm text-zinc-600">Hair and nail treatments.</p>
        </Link>
        <Link
          href="/dashboard/staff"
          className={`${surfaceInteractiveClass} block p-4 ${focusRingClass}`}
        >
          <h2 className="font-medium text-zinc-900">Staff</h2>
          <p className="mt-1 text-sm text-zinc-600">Who can perform each service.</p>
        </Link>
        <Link
          href="/dashboard/book"
          className={`${surfaceInteractiveClass} block p-4 ${focusRingClass}`}
        >
          <h2 className="font-medium text-zinc-900">Book</h2>
          <p className="mt-1 text-sm text-zinc-600">Pick a service, staff, and time.</p>
        </Link>
        <Link
          href="/dashboard/appointments"
          className={`${surfaceInteractiveClass} block p-4 ${focusRingClass}`}
        >
          <h2 className="font-medium text-zinc-900">Appointments</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Upcoming bookings and pay-at-salon totals.
          </p>
        </Link>
        {isOrgAdmin ? (
          <Link
            href="/dashboard/admin"
            className={`${surfaceInteractiveClass} block p-4 ${focusRingClass}`}
          >
            <h2 className="font-medium text-zinc-900">Admin</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Manage categories, services, and staff.
            </p>
          </Link>
        ) : null}
      </div>
    </main>
  );
}
