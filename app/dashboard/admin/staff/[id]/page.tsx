import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffForEdit, listActiveServicesForPicker } from "@/lib/catalog";
import { requireAdmin } from "@/lib/require-admin";
import {
  checkboxClass,
  controlClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { ActionForm } from "../../action-form";
import { updateStaff } from "../actions";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [person, services] = await Promise.all([
    getStaffForEdit(id),
    listActiveServicesForPicker(),
  ]);

  if (!person) {
    notFound();
  }

  const selectedIds = new Set(person.services.map((row) => row.serviceId));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Edit staff member
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/admin/staff/${person.id}/schedule`}
            className={secondaryButtonClass}
          >
            Schedule
          </Link>
          <Link href="/dashboard/admin/staff" className={secondaryButtonClass}>
            Back
          </Link>
        </div>
      </div>

      <ActionForm
        action={updateStaff}
        className="mt-8 max-w-lg space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={person.id} />
        <label className={labelClass}>
          <span className={labelTextClass}>Name</span>
          <input
            name="name"
            required
            defaultValue={person.name}
            className={controlClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Bio</span>
          <textarea
            name="bio"
            rows={3}
            defaultValue={person.bio ?? ""}
            className={controlClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-900">
          <input
            type="checkbox"
            name="active"
            defaultChecked={person.active}
            className={checkboxClass}
          />
          Active
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-zinc-900">Services</legend>
          <div className="grid gap-2">
            {services.map((service) => (
              <label
                key={service.id}
                className="flex items-center gap-2 text-sm text-zinc-900"
              >
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={service.id}
                  defaultChecked={selectedIds.has(service.id)}
                  className={checkboxClass}
                />
                {service.category.name} · {service.name}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className={primaryButtonClass}>
          Save changes
        </button>
      </ActionForm>
    </main>
  );
}
