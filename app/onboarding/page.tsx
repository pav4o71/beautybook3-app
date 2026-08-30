import Link from "next/link";
import { listUserMemberships } from "@/lib/org-context";
import { requireUser } from "@/lib/require-user";
import {
  controlClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { ActionForm } from "@/app/dashboard/admin/action-form";
import { createOrganization } from "./actions";

export default async function OnboardingPage() {
  const session = await requireUser();
  const memberships = await listUserMemberships(session.user.id);

  if (memberships.length > 0) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          You already have a business
        </h1>
        <p className="text-sm text-zinc-600">
          Continue to your dashboard or create another salon later from settings.
        </p>
        <Link href="/dashboard" className={`w-fit ${primaryButtonClass}`}>
          Go to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Start your salon on BeautyBook
        </h1>
        <p className="text-sm text-zinc-600">
          Create your business profile, add services, and accept bookings.
        </p>
      </div>

      <ActionForm action={createOrganization} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
        <label className={labelClass}>
          <span className={labelTextClass}>Business name</span>
          <input
            name="name"
            required
            className={controlClass}
            placeholder="Sunrise Salon"
          />
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
  );
}
