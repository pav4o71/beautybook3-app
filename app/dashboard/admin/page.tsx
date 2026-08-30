import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/require-admin";
import { focusRingClass, pageMainClass, surfaceInteractiveClass } from "@/lib/ui";

export default async function AdminHomePage() {
  await requireAdmin();

  return (
    <main className={pageMainClass}>
      <PageHeader
        title="Admin"
        lead="Catalog, staff, schedules, and today's appointment board."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/admin/appointments"
          className={`${surfaceInteractiveClass} block p-4 ${focusRingClass}`}
        >
          <h2 className="font-medium text-zinc-900">Appointments</h2>
          <p className="mt-1 text-sm text-zinc-600">Today&apos;s board — complete or cancel.</p>
        </Link>
        <Link
          href="/dashboard/admin/locations"
          className={`${surfaceInteractiveClass} block p-4 ${focusRingClass}`}
        >
          <h2 className="font-medium text-zinc-900">Locations</h2>
          <p className="mt-1 text-sm text-zinc-600">Branches, addresses, and default site.</p>
        </Link>
        <Link
          href="/dashboard/admin/categories"
          className={`${surfaceInteractiveClass} block p-4 ${focusRingClass}`}
        >
          <h2 className="font-medium text-zinc-900">Categories</h2>
          <p className="mt-1 text-sm text-zinc-600">Hair, nails, and sort order.</p>
        </Link>
        <Link
          href="/dashboard/admin/services"
          className={`${surfaceInteractiveClass} block p-4 ${focusRingClass}`}
        >
          <h2 className="font-medium text-zinc-900">Services</h2>
          <p className="mt-1 text-sm text-zinc-600">Treatments, duration, and price.</p>
        </Link>
        <Link
          href="/dashboard/admin/settings"
          className={`${surfaceInteractiveClass} block p-4 ${focusRingClass}`}
        >
          <h2 className="font-medium text-zinc-900">Settings</h2>
          <p className="mt-1 text-sm text-zinc-600">Marketplace visibility and timezone.</p>
        </Link>
        <Link
          href="/dashboard/admin/staff"
          className={`${surfaceInteractiveClass} block p-4 ${focusRingClass}`}
        >
          <h2 className="font-medium text-zinc-900">Staff</h2>
          <p className="mt-1 text-sm text-zinc-600">Team members, services, and hours.</p>
        </Link>
      </div>
    </main>
  );
}
