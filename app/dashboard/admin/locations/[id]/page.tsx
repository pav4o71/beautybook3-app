import Link from "next/link";
import { notFound } from "next/navigation";
import { MANILA_AREAS } from "@/lib/areas";
import { getLocationById } from "@/lib/locations";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  checkboxClass,
  controlClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { ActionForm } from "../../action-form";
import { updateLocationAction } from "../actions";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizationId } = await requireActiveOrgAdmin();
  const { id } = await params;

  const location = await getLocationById(organizationId, id);
  if (!location) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Edit location
        </h1>
        <Link href="/dashboard/admin/locations" className={secondaryButtonClass}>
          Back
        </Link>
      </div>

      <ActionForm
        action={updateLocationAction}
        className="mt-8 max-w-lg space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={location.id} />

        <label className={labelClass}>
          <span className={labelTextClass}>Name</span>
          <input
            name="name"
            required
            defaultValue={location.name}
            className={controlClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Address</span>
          <input
            name="address"
            defaultValue={location.address ?? ""}
            className={controlClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Area</span>
          <select
            name="area"
            defaultValue={location.area ?? ""}
            className={controlClass}
          >
            <option value="">Select area</option>
            {MANILA_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Timezone</span>
          <select
            name="timezone"
            defaultValue={location.timezone}
            className={controlClass}
          >
            <option value="Asia/Manila">Asia/Manila (Philippines)</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-900">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={location.isDefault}
            className={checkboxClass}
          />
          Default location for this business
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-900">
          <input
            type="checkbox"
            name="active"
            defaultChecked={location.active}
            className={checkboxClass}
          />
          Active (accepts bookings)
        </label>

        <p className="text-sm text-zinc-600">
          {location._count.staff} active staff · {location._count.appointments}{" "}
          appointments linked to this location.
        </p>

        <button type="submit" className={primaryButtonClass}>
          Save changes
        </button>
      </ActionForm>
    </main>
  );
}
