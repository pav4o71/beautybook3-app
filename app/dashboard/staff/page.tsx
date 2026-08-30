import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { listActiveStaff } from "@/lib/catalog";
import { requireActiveOrgContext } from "@/lib/require-org";
import { pageMainClass, primaryButtonClass } from "@/lib/ui";

export default async function StaffPage() {
  const { organizationId } = await requireActiveOrgContext();

  const staff = await listActiveStaff(organizationId);

  return (
    <main className={pageMainClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Staff</h1>
          <p className="text-sm text-zinc-600">Who can perform each service.</p>
        </div>
        <Link href="/dashboard/book" className={primaryButtonClass}>
          Book
        </Link>
      </div>
      {staff.length === 0 ? (
        <EmptyState
          title="No staff listed yet"
          description="Ask the salon to add team members in admin."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {staff.map((person) => (
            <li key={person.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <h2 className="font-medium text-zinc-900">{person.name}</h2>
              {person.bio ? <p className="mt-1 text-sm text-zinc-600">{person.bio}</p> : null}
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Services
              </p>
              <p className="mt-1 text-sm text-zinc-700">
                {person.services.map((row) => row.service.name).join(", ") || "None yet"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
