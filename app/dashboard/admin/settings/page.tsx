import Link from "next/link";
import { getOrganizationForSettings } from "@/lib/catalog";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  checkboxClass,
  controlClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  successAlertClass,
} from "@/lib/ui";
import { ActionForm } from "../action-form";
import { AdminNav } from "../admin-nav";
import { updateOrganizationSettings } from "./actions";

export default async function BusinessSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { organizationId } = await requireActiveOrgAdmin();
  const params = await searchParams;
  const organization = await getOrganizationForSettings(organizationId);

  if (!organization) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <AdminNav current="settings" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Business settings
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage your salon profile and marketplace visibility.
          </p>
        </div>
        <Link href="/dashboard/admin" className={secondaryButtonClass}>
          Back to admin
        </Link>
      </div>

      {params.saved === "1" ? (
        <p className={`mt-4 ${successAlertClass}`}>Settings saved.</p>
      ) : null}

      <ActionForm
        action={updateOrganizationSettings}
        encType="multipart/form-data"
        className="mt-6 space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <label className={labelClass}>
          <span className={labelTextClass}>Business name</span>
          <input
            name="name"
            required
            defaultValue={organization.name}
            className={controlClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Public URL slug</span>
          <input
            readOnly
            value={organization.slug}
            className={`${controlClass} bg-zinc-50`}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Timezone</span>
          <select
            name="timezone"
            defaultValue={organization.timezone}
            className={controlClass}
          >
            <option value="Asia/Manila">Asia/Manila (Philippines)</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-900">
          <input
            type="checkbox"
            name="published"
            defaultChecked={organization.published}
            className={checkboxClass}
          />
          List on marketplace ({`/s/${organization.slug}`})
        </label>

        {organization.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- mixed local paths and owner-pasted http(s) URLs
          <img
            src={organization.coverImageUrl}
            alt=""
            className="h-32 w-full rounded-md object-cover"
          />
        ) : null}

        <label className={labelClass}>
          <span className={labelTextClass}>Cover image URL</span>
          <input
            name="coverImageUrl"
            defaultValue={organization.coverImageUrl ?? ""}
            placeholder="/images/salons/your-salon.jpg"
            className={controlClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Or upload a cover (JPEG, PNG, or WebP, max 2MB)</span>
          <input
            type="file"
            name="coverImage"
            accept="image/jpeg,image/png,image/webp"
            className={controlClass}
          />
        </label>

        <button type="submit" className={primaryButtonClass}>
          Save settings
        </button>
      </ActionForm>
    </main>
  );
}
