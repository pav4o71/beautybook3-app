import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { listAdminCatalog } from "@/lib/catalog";
import { requireActiveOrgAdmin } from "@/lib/require-org";
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
import { activateService, createService, deactivateService } from "./actions";

export default async function AdminServicesPage() {
  const { organizationId } = await requireActiveOrgAdmin();

  const categories = await listAdminCatalog(organizationId);

  const hasCategories = categories.length > 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <AdminCatalogNav current="services" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Services
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Treatments shown on the catalog and booking page.
          </p>
        </div>
        <Link href="/dashboard/admin" className={secondaryButtonClass}>
          Back to admin
        </Link>
      </div>

      <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium text-zinc-900">Add service</h2>
        {!hasCategories ? (
          <p className="mt-3 text-sm text-amber-800">
            Create a category first before adding services.{" "}
            <Link href="/dashboard/admin/categories" className="underline">
              Go to categories
            </Link>
          </p>
        ) : (
          <ActionForm action={createService} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelTextClass}>Category</span>
              <select name="categoryId" required className={controlClass}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Name</span>
              <input name="name" required className={controlClass} />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              <span className={labelTextClass}>Description</span>
              <textarea name="description" rows={2} className={controlClass} />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>Duration (minutes)</span>
              <input
                name="durationMin"
                type="number"
                min={1}
                required
                defaultValue={45}
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
                placeholder="350.00"
                className={controlClass}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-900">
              <input
                type="checkbox"
                name="active"
                defaultChecked
                className={checkboxClass}
              />
              Active
            </label>
            <div className="flex items-end sm:col-span-2">
              <button type="submit" className={primaryButtonClass}>
                Create
              </button>
            </div>
          </ActionForm>
        )}
      </section>

      <div className="mt-6 space-y-8">
        {categories.map((category) => (
          <section key={category.id}>
            <h2 className="text-lg font-medium text-zinc-900">{category.name}</h2>
            {category.services.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600">No services in this category.</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
                {category.services.map((service) => (
                  <li
                    key={service.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <p className="font-medium text-zinc-900">
                        {service.name}
                        {!service.active ? (
                          <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-600">
                            Inactive
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-zinc-600">
                        {service.durationMin} min · {formatPrice(service.priceCents)}
                      </p>
                      {service.description ? (
                        <p className="mt-1 text-sm text-zinc-600">{service.description}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/admin/services/${service.id}`}
                        className={secondaryButtonClass}
                      >
                        Edit
                      </Link>
                      {service.active ? (
                        <form action={deactivateService}>
                          <input type="hidden" name="id" value={service.id} />
                          <button type="submit" className={dangerButtonClass}>
                            Deactivate
                          </button>
                        </form>
                      ) : (
                        <form action={activateService}>
                          <input type="hidden" name="id" value={service.id} />
                          <button type="submit" className={primaryButtonClass}>
                            Activate
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
