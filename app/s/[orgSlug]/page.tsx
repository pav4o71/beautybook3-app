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

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Salon</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {organization.name}
        </h1>
      </div>

      {organization.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- mixed local paths and owner-pasted http(s) URLs
        <img
          src={organization.coverImageUrl}
          alt=""
          width={800}
          height={400}
          className="h-48 w-full rounded-lg object-cover"
        />
      ) : null}

      {organization.locations.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-900">Locations</h2>
          <ul className="space-y-2">
            {organization.locations.map((location) => (
              <li
                key={location.id}
                className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700"
              >
                <p className="font-medium text-zinc-900">
                  {location.name}
                  {location.isDefault ? (
                    <span className="ml-2 text-xs font-normal text-zinc-500">(default)</span>
                  ) : null}
                  {location.area ? (
                    <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-700">
                      {location.area}
                    </span>
                  ) : null}
                </p>
                {location.address ? (
                  <p className="mt-1 text-zinc-600">{location.address}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-zinc-700">
        Book services online. Your slot is held when you book; pay at the salon when you arrive.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link href={`/s/${orgSlug}/book`} className={primaryButtonClass}>
          Book an appointment
        </Link>
        <Link href="/" className={secondaryButtonClass}>
          Back to search
        </Link>
      </div>
    </main>
  );
}
