import Link from "next/link";
import { getOrganizationForSettings, listActiveServicesForPicker } from "@/lib/catalog";
import { isPremiumListing } from "@/lib/listing";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  checkboxClass,
  controlClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionTitleClass,
  successAlertClass,
} from "@/lib/ui";
import { ActionForm } from "../action-form";
import { AdminNav } from "../admin-nav";
import { updateOrganizationSettings } from "./actions";
import { updateListingProfileAction } from "./listing-actions";

export default async function BusinessSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; listingSaved?: string }>;
}) {
  const { organizationId } = await requireActiveOrgAdmin();
  const params = await searchParams;
  const [organization, services] = await Promise.all([
    getOrganizationForSettings(organizationId),
    listActiveServicesForPicker(organizationId),
  ]);

  if (!organization) {
    return null;
  }

  const highlightSlots = Array.from({ length: 5 }, (_, index) => organization.highlights[index] ?? "");

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
      {params.listingSaved === "1" ? (
        <p className={`mt-4 ${successAlertClass}`}>Listing profile saved.</p>
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

        <label className={labelClass}>
          <span className={labelTextClass}>About this salon</span>
          <textarea
            name="description"
            rows={4}
            defaultValue={organization.description ?? ""}
            placeholder="Tell customers what you offer."
            className={controlClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Phone</span>
          <input
            name="phone"
            defaultValue={organization.phone ?? ""}
            placeholder="+63 2 8888 0100"
            className={controlClass}
          />
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

      <ActionForm
        action={updateListingProfileAction}
        encType="multipart/form-data"
        className="mt-6 space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <div>
          <h2 className={sectionTitleClass}>Marketplace listing</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Customize how your salon appears in search and on your storefront.
            {isPremiumListing(organization.listingTier) ? " Premium tier is active." : ""}
          </p>
        </div>

        <label className={labelClass}>
          <span className={labelTextClass}>Tagline</span>
          <input
            name="tagline"
            maxLength={120}
            defaultValue={organization.tagline ?? ""}
            placeholder="Short line shown under your salon name"
            className={controlClass}
          />
        </label>

        <fieldset className="space-y-2">
          <legend className={labelTextClass}>Highlights (up to 5)</legend>
          {highlightSlots.map((value, index) => (
            <input
              key={index}
              name="highlights"
              defaultValue={value}
              placeholder={`Highlight ${index + 1}`}
              className={controlClass}
            />
          ))}
        </fieldset>

        <label className={labelClass}>
          <span className={labelTextClass}>Featured service</span>
          <select
            name="featuredServiceId"
            defaultValue={organization.featuredServiceId ?? ""}
            className={controlClass}
          >
            <option value="">Cheapest bookable service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </label>

        {organization.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- mixed local paths and owner-pasted http(s) URLs
          <img
            src={organization.logoUrl}
            alt=""
            className="size-20 rounded-full border border-zinc-200 object-cover"
          />
        ) : null}

        <label className={labelClass}>
          <span className={labelTextClass}>Logo URL</span>
          <input
            name="logoUrl"
            defaultValue={organization.logoUrl ?? ""}
            placeholder="/uploads/orgs/your-org/logo.jpg"
            className={controlClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Or upload a logo (JPEG, PNG, or WebP, max 2MB)</span>
          <input
            type="file"
            name="logoImage"
            accept="image/jpeg,image/png,image/webp"
            className={controlClass}
          />
        </label>

        {isPremiumListing(organization.listingTier) ? (
          <>
            <label className={labelClass}>
              <span className={labelTextClass}>Accent color</span>
              <input
                name="accentColor"
                defaultValue={organization.accentColor ?? ""}
                placeholder="#E11D48"
                className={controlClass}
              />
            </label>

            <label className={labelClass}>
              <span className={labelTextClass}>Website URL</span>
              <input
                name="websiteUrl"
                defaultValue={organization.websiteUrl ?? ""}
                placeholder="https://example.com"
                className={controlClass}
              />
            </label>

            <label className={labelClass}>
              <span className={labelTextClass}>Instagram URL</span>
              <input
                name="instagramUrl"
                defaultValue={organization.instagramUrl ?? ""}
                placeholder="https://instagram.com/your-salon"
                className={controlClass}
              />
            </label>

            <label className={labelClass}>
              <span className={labelTextClass}>Facebook URL</span>
              <input
                name="facebookUrl"
                defaultValue={organization.facebookUrl ?? ""}
                placeholder="https://facebook.com/your-salon"
                className={controlClass}
              />
            </label>
          </>
        ) : null}

        <button type="submit" className={primaryButtonClass}>
          Save listing profile
        </button>
      </ActionForm>
    </main>
  );
}
