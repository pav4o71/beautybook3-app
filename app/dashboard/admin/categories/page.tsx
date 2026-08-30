import Link from "next/link";
import { listAdminCategories } from "@/lib/catalog";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  controlClass,
  dangerButtonClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { ActionForm } from "../action-form";
import { AdminCatalogNav } from "../admin-catalog-nav";
import { createCategory, deleteCategory } from "./actions";

export default async function AdminCategoriesPage() {
  const { organizationId } = await requireActiveOrgAdmin();

  const categories = await listAdminCategories(organizationId);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <AdminCatalogNav current="categories" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Categories
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Group services for the catalog and booking flow.
          </p>
        </div>
        <Link href="/dashboard/admin" className={secondaryButtonClass}>
          Back to admin
        </Link>
      </div>

      <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium text-zinc-900">Add category</h2>
        <ActionForm action={createCategory} className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            <span className={labelTextClass}>Name</span>
            <input name="name" required className={controlClass} placeholder="Hair" />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Sort order</span>
            <input
              name="sortOrder"
              type="number"
              defaultValue={0}
              className={controlClass}
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className={primaryButtonClass}>
              Create
            </button>
          </div>
        </ActionForm>
      </section>

      <ul className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex flex-wrap items-center justify-between gap-4 p-4"
          >
            <div>
              <p className="font-medium text-zinc-900">
                {category.name}
                <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-600">
                  {category._count.services} service
                  {category._count.services === 1 ? "" : "s"}
                </span>
              </p>
              <p className="text-sm text-zinc-600">
                slug: {category.slug} · sort: {category.sortOrder}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/admin/categories/${category.id}`}
                className={secondaryButtonClass}
              >
                Edit
              </Link>
              <ActionForm action={deleteCategory}>
                <input type="hidden" name="id" value={category.id} />
                <button
                  type="submit"
                  className={dangerButtonClass}
                  disabled={category._count.services > 0}
                  title={
                    category._count.services > 0
                      ? "Move or remove services in this category first"
                      : undefined
                  }
                >
                  Delete
                </button>
              </ActionForm>
              {category._count.services > 0 ? (
                <span className="text-xs text-zinc-500">
                  Remove services before deleting
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
