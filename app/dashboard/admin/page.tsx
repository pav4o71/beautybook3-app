import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { pageMainClass } from "@/lib/ui";

export default async function AdminHomePage() {
  await requireAdmin();

  return (
    <main className={pageMainClass}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Admin</h1>
        <p className="text-sm text-zinc-600">
          Catalog, staff, schedules, and today&apos;s appointment board.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/admin/appointments"
          className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400"
        >
          <h2 className="font-medium text-zinc-900">Appointments</h2>
          <p className="mt-1 text-sm text-zinc-600">Today&apos;s board — complete or cancel.</p>
        </Link>
        <Link
          href="/dashboard/admin/locations"
          className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400"
        >
          <h2 className="font-medium text-zinc-900">Locations</h2>
          <p className="mt-1 text-sm text-zinc-600">Branches, addresses, and default site.</p>
        </Link>
        <Link
          href="/dashboard/admin/categories"
          className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400"
        >
          <h2 className="font-medium text-zinc-900">Categories</h2>
          <p className="mt-1 text-sm text-zinc-600">Hair, nails, and sort order.</p>
        </Link>
        <Link
          href="/dashboard/admin/services"
          className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400"
        >
          <h2 className="font-medium text-zinc-900">Services</h2>
          <p className="mt-1 text-sm text-zinc-600">Treatments, duration, and price.</p>
        </Link>
        <Link
          href="/dashboard/admin/settings"
          className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400"
        >
          <h2 className="font-medium text-zinc-900">Settings</h2>
          <p className="mt-1 text-sm text-zinc-600">Marketplace visibility and timezone.</p>
        </Link>
        <Link
          href="/dashboard/admin/staff"
          className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400"
        >
          <h2 className="font-medium text-zinc-900">Staff</h2>
          <p className="mt-1 text-sm text-zinc-600">Team members, services, and hours.</p>
        </Link>
      </div>
    </main>
  );
}
