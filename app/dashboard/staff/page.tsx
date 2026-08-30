import { listActiveStaff } from "@/lib/catalog";
import { requireUser } from "@/lib/require-user";

export default async function StaffPage() {
  await requireUser();

  const staff = await listActiveStaff();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {staff.map((person) => (
          <li key={person.id} className="rounded-lg border border-zinc-200 p-4">
            <h2 className="font-medium">{person.name}</h2>
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
    </main>
  );
}
