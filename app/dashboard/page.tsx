import Link from "next/link";
import { resolveActiveOrganization } from "@/lib/org-context";
import { isOrgAdminRole } from "@/lib/org-roles";
import { requireUser } from "@/lib/require-user";

export default async function DashboardPage() {
  const session = await requireUser();
  const active = await resolveActiveOrganization(session.user.id);
  const isOrgAdmin =
    session.user.role === "ADMIN" ||
    (active ? isOrgAdminRole(active.membership.role) : false);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-600">
          Signed in as {session.user.name}
          {active ? ` · ${active.organization.name} (${active.membership.role})` : ""}.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/services"
          className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400"
        >
          <h2 className="font-medium text-zinc-900">Services</h2>
          <p className="mt-1 text-sm text-zinc-600">Hair and nail treatments.</p>
        </Link>
        <Link
          href="/dashboard/staff"
          className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400"
        >
          <h2 className="font-medium text-zinc-900">Staff</h2>
          <p className="mt-1 text-sm text-zinc-600">Who can perform each service.</p>
        </Link>
        <Link
          href="/dashboard/book"
          className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400"
        >
          <h2 className="font-medium text-zinc-900">Book</h2>
          <p className="mt-1 text-sm text-zinc-600">Pick a service, staff, and time.</p>
        </Link>
        <Link
          href="/dashboard/appointments"
          className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400"
        >
          <h2 className="font-medium text-zinc-900">Appointments</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Upcoming bookings and pay-at-salon totals.
          </p>
        </Link>
        {isOrgAdmin ? (
          <Link
            href="/dashboard/admin"
            className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400"
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
