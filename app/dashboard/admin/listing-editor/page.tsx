import Link from "next/link";
import { listActiveServicesForPicker } from "@/lib/catalog";
import { getListingEditorState } from "@/lib/listing-editor";
import { isPremiumListing } from "@/lib/listing";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import { secondaryButtonClass } from "@/lib/ui";
import { AdminNav } from "../admin-nav";
import { ListingEditorClient } from "./listing-editor-client";

export default async function ListingEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { organizationId } = await requireActiveOrgAdmin();
  const params = await searchParams;

  const [state, services] = await Promise.all([
    getListingEditorState(organizationId),
    listActiveServicesForPicker(organizationId),
  ]);

  if (!state) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <AdminNav current="listing-editor" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Customize listing
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Preview changes live, then save to publish.
            {isPremiumListing(state.listingTier)
              ? " Premium listing — full customization enabled."
              : " Standard listing — upgrade for gallery and theme controls."}
          </p>
        </div>
        <Link href="/dashboard/admin/settings" className={secondaryButtonClass}>
          Back to settings
        </Link>
      </div>

      <ListingEditorClient
        initialState={state}
        services={services}
        saved={params.saved === "1"}
      />
    </main>
  );
}
