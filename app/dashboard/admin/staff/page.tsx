import Link from "next/link";
import {
  listActiveServicesForPicker,
  listAdminStaffBoard,
} from "@/lib/catalog";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import { summarizeStaffSchedule } from "@/lib/schedule";
import {
  checkboxClass,
  controlClass,
  dangerButtonClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { ActionForm } from "../action-form";
import { AdminCatalogNav } from "../admin-catalog-nav";
import { activateStaff, createStaff, deactivateStaff } from "./actions";

export default async function AdminStaffPage() {
  const { organizationId } = await requireActiveOrgAdmin();

  const [staff, services] = await Promise.all([
    listAdminStaffBoard(organizationId),
    listActiveServicesForPicker(organizationId),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <AdminCatalogNav current="staff" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Staff</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Team members, services, and weekly hours.
          </p>
        </div>
        <Link href="/dashboard/admin" className={secondaryButtonClass}>
          Back to admin
        </Link>
      </div>

      <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium text-zinc-900">Add staff member</h2>
        <ActionForm action={createStaff} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelTextClass}>Name</span>
              <input name="name" required className={controlClass} />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm text-zinc-900">
              <input
                type="checkbox"
                name="active"
                defaultChecked
                className={checkboxClass}
              />
              Active
            </label>
          </div>
          <label className={labelClass}>
            <span className={labelTextClass}>Bio</span>
            <textarea name="bio" rows={2} className={controlClass} />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-900">Services</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-2 text-sm text-zinc-900"
                >
                  <input
                    type="checkbox"
                    name="serviceIds"
                    value={service.id}
                    className={checkboxClass}
                  />
                  {service.category.name} · {service.name}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className={primaryButtonClass}>
            Create
          </button>
        </ActionForm>
      </section>

      <ul className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {staff.map((person) => (
          <li
            key={person.id}
            className="flex flex-wrap items-center justify-between gap-4 p-4"
          >
            <div>
              <p className="font-medium text-zinc-900">
                {person.name}
                {!person.active ? (
                  <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-600">
                    Inactive
                  </span>
                ) : null}
              </p>
              {person.bio ? (
                <p className="mt-1 text-sm text-zinc-600">{person.bio}</p>
              ) : null}
              <p className="mt-2 text-sm text-zinc-600">
                {person.services.map((row) => row.service.name).join(", ") || "No services"}
              </p>
              <p className="mt-1 text-sm text-zinc-700">
                Hours: {summarizeStaffSchedule(person.schedules)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/admin/staff/${person.id}/schedule`}
                className={secondaryButtonClass}
              >
                Schedule
              </Link>
              <Link
                href={`/dashboard/admin/staff/${person.id}`}
                className={secondaryButtonClass}
              >
                Edit
              </Link>
              {person.active ? (
                <form action={deactivateStaff}>
                  <input type="hidden" name="id" value={person.id} />
                  <button type="submit" className={dangerButtonClass}>
                    Deactivate
                  </button>
                </form>
              ) : (
                <form action={activateStaff}>
                  <input type="hidden" name="id" value={person.id} />
                  <button type="submit" className={primaryButtonClass}>
                    Activate
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
