import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SiteHeader } from "@/components/site-header";
import { listUserMemberships } from "@/lib/org-context";
import { requireUser } from "@/lib/require-user";
import {
  controlClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  surfaceClass,
} from "@/lib/ui";
import { ActionForm } from "@/app/dashboard/admin/action-form";
import { createOrganization } from "./actions";

export default async function OnboardingPage() {
  const session = await requireUser();
  const memberships = await listUserMemberships(session.user.id);

  if (memberships.length > 0) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-16">
          <PageHeader
            title="You already have a business"
            lead="Continue to your dashboard or create another salon later from settings."
          />
          <Link href="/dashboard" className={`w-fit ${primaryButtonClass}`}>
            Go to dashboard
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-16">
        <PageHeader
          title="Start your salon on BeautyBook"
          lead="Create your business profile, add services, and accept bookings."
        />

        <ActionForm
          action={createOrganization}
          className={`${surfaceClass} space-y-4 p-5`}
        >
          <label className={labelClass}>
            <span className={labelTextClass}>Business name</span>
            <input name="name" required className={controlClass} placeholder="Sunrise Salon" />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Timezone</span>
            <select name="timezone" defaultValue="Asia/Manila" className={controlClass}>
              <option value="Asia/Manila">Asia/Manila (Philippines)</option>
            </select>
          </label>
          <button type="submit" className={primaryButtonClass}>
            Create business
          </button>
        </ActionForm>

        <Link href="/dashboard" className={`w-fit ${secondaryButtonClass}`}>
          Cancel
        </Link>
      </main>
    </>
  );
}
