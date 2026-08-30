import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryById } from "@/lib/catalog";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  controlClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { ActionForm } from "../../action-form";
import { updateCategory } from "../actions";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizationId } = await requireActiveOrgAdmin();
  const { id } = await params;

  const category = await getCategoryById(organizationId, id);
  if (!category) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Edit category
        </h1>
        <Link href="/dashboard/admin/categories" className={secondaryButtonClass}>
          Back
        </Link>
      </div>

      <ActionForm
        action={updateCategory}
        className="mt-8 max-w-lg space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={category.id} />
        <label className={labelClass}>
          <span className={labelTextClass}>Name</span>
          <input
            name="name"
            required
            defaultValue={category.name}
            className={controlClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Sort order</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={category.sortOrder}
            className={controlClass}
          />
        </label>
        <p className="text-sm text-zinc-600">Slug: {category.slug} (updates from name)</p>
        <button type="submit" className={primaryButtonClass}>
          Save changes
        </button>
      </ActionForm>
    </main>
  );
}
