import Link from "next/link";
import { notFound } from "next/navigation";
import { getSalonStorefront } from "@/lib/salon";
import { weekdayLabel } from "@/lib/schedule";
import { secondaryButtonClass } from "@/lib/ui";
import { ServicePicker } from "./service-picker";

export default async function SalonLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const salon = await getSalonStorefront(orgSlug);

  if (!salon) {
    notFound();
  }

  const preselectName = query.service?.trim().toLowerCase();
  const initialServiceIds = preselectName
    ? salon.categories
        .flatMap((category) => category.services)
        .filter((service) => service.name.toLowerCase() === preselectName)
        .map((service) => service.id)
    : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Salon</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {salon.name}
        </h1>
        {salon.phone ? <p className="text-sm text-zinc-600">{salon.phone}</p> : null}
      </div>

      {salon.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- mixed local paths and owner-pasted http(s) URLs
        <img
          src={salon.coverImageUrl}
          alt=""
          width={800}
          height={400}
          className="h-48 w-full rounded-lg object-cover"
        />
      ) : null}

      {salon.description ? (
        <p className="whitespace-pre-line text-zinc-700">{salon.description}</p>
      ) : (
        <p className="text-zinc-700">
          Book services online. Your slot is held when you book; pay at the salon when you
          arrive.
        </p>
      )}

      {salon.locations.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-900">Locations</h2>
          <ul className="space-y-2">
            {salon.locations.map((location) => (
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
                {location.phone ? (
                  <p className="mt-1 text-zinc-600">{location.phone}</p>
                ) : null}
                {location.hours.length > 0 ? (
                  <ul className="mt-2 space-y-0.5 text-xs text-zinc-600">
                    {location.hours.map((window) => (
                      <li key={window.weekday}>
                        {weekdayLabel(window.weekday)} {window.startTime}–{window.endTime}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">Hours not posted yet.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {salon.categories.length === 0 ? (
        <p className="text-sm text-zinc-600">No bookable services yet.</p>
      ) : (
        <ServicePicker
          orgSlug={orgSlug}
          categories={salon.categories}
          locations={salon.locations.map((location) => ({ id: location.id }))}
          staff={salon.staff}
          initialServiceIds={initialServiceIds}
        />
      )}

      <div>
        <Link href="/" className={secondaryButtonClass}>
          Back to search
        </Link>
      </div>
    </main>
  );
}
