import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedOrganizationBySlug } from "@/lib/tenant";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export default async function SalonLandingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const organization = await getPublishedOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  const location = organization.locations[0];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Salon</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {organization.name}
        </h1>
        {location ? (
          <p className="text-sm text-zinc-600">
            {location.name}
            {location.address ? ` · ${location.address}` : ""}
          </p>
        ) : null}
      </div>

      <p className="text-zinc-700">
        Book services online. Your slot is held when you book; pay at the salon when you arrive.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link href={`/s/${orgSlug}/book`} className={primaryButtonClass}>
          Book an appointment
        </Link>
        <Link href="/marketplace" className={secondaryButtonClass}>
          Back to marketplace
        </Link>
      </div>
    </main>
  );
}
