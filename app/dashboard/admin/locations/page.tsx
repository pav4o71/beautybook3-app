import Link from "next/link";
import { listLocations } from "@/lib/locations";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  checkboxClass,
  controlClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { ActionForm } from "../action-form";
import { AdminNav } from "../admin-nav";
import { createLocationAction, makeDefaultLocation } from "./actions";

export default async function AdminLocationsPage() {
  const { organizationId } = await requireActiveOrgAdmin();
  const locations = await listLocations(organizationId);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <AdminNav current="locations" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Locations
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Branches where staff work and customers book appointments.
          </p>
        </div>
        <Link href="/dashboard/admin" className={secondaryButtonClass}>
          Back to admin
        </Link>
      </div>

      <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium text-zinc-900">Add location</h2>
        <ActionForm
          action={createLocationAction}
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          <label className={labelClass}>
            <span className={labelTextClass}>Name</span>
            <input
              name="name"
              required
              className={controlClass}
              placeholder="BGC branch"
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Address</span>
            <input
              name="address"
              className={controlClass}
              placeholder="Optional street address"
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Timezone</span>
            <select name="timezone" defaultValue="Asia/Manila" className={controlClass}>
              <option value="Asia/Manila">Asia/Manila (Philippines)</option>
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-zinc-900">
            <input type="checkbox" name="isDefault" className={checkboxClass} />
            Set as default location
          </label>
          <div className="flex items-end sm:col-span-2">
            <button type="submit" className={primaryButtonClass}>
              Create location
            </button>
          </div>
        </ActionForm>
      </section>

      <ul className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {locations.length === 0 ? (
          <li className="p-4 text-sm text-zinc-600">No locations yet.</li>
        ) : (
          locations.map((location) => (
            <li
              key={location.id}
              className="flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="font-medium text-zinc-900">
                  {location.name}
                  {location.isDefault ? (
                    <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-normal text-emerald-800">
                      Default
                    </span>
                  ) : null}
                  {!location.active ? (
                    <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-600">
                      Inactive
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-zinc-600">
                  {location.address ?? "No address"}
                  {" · "}
                  {location.timezone}
                </p>
                <p className="text-xs text-zinc-500">
                  {location._count.staff} active staff · {location._count.appointments}{" "}
                  appointment{location._count.appointments === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/dashboard/admin/locations/${location.id}`}
                  className={secondaryButtonClass}
                >
                  Edit
                </Link>
                {location.active && !location.isDefault ? (
                  <ActionForm action={makeDefaultLocation}>
                    <input type="hidden" name="id" value={location.id} />
                    <button type="submit" className={secondaryButtonClass}>
                      Make default
                    </button>
                  </ActionForm>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
