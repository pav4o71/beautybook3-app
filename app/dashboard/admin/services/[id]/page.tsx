import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { getServiceForEdit, listCategoryOptions } from "@/lib/catalog";
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
import { updateService } from "../actions";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizationId } = await requireActiveOrgAdmin();
  const { id } = await params;

  const [service, categories] = await Promise.all([
    getServiceForEdit(organizationId, id),
    listCategoryOptions(organizationId),
  ]);

  if (!service) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Edit service
        </h1>
        <Link href="/dashboard/admin/services" className={secondaryButtonClass}>
          Back
        </Link>
      </div>

      <ActionForm
        action={updateService}
        className="mt-8 max-w-lg space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={service.id} />
        <label className={labelClass}>
          <span className={labelTextClass}>Category</span>
          <select
            name="categoryId"
            required
            defaultValue={service.categoryId}
            className={controlClass}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Name</span>
          <input
            name="name"
            required
            defaultValue={service.name}
            className={controlClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Description</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={service.description ?? ""}
            className={controlClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Duration (minutes)</span>
          <input
            name="durationMin"
            type="number"
            min={1}
            required
            defaultValue={service.durationMin}
            className={controlClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Price (PHP)</span>
          <input
            name="pricePhp"
            type="text"
            inputMode="decimal"
            required
            defaultValue={(service.priceCents / 100).toFixed(2)}
            className={controlClass}
          />
        </label>
        <p className="text-sm text-zinc-600">
          Current price: {formatPrice(service.priceCents)}. Past appointments keep
          their booked price.
        </p>
        <label className="flex items-center gap-2 text-sm text-zinc-900">
          <input
            type="checkbox"
            name="active"
            defaultChecked={service.active}
            className={checkboxClass}
          />
          Active
        </label>
        <button type="submit" className={primaryButtonClass}>
          Save changes
        </button>
      </ActionForm>
    </main>
  );
}
