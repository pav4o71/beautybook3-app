import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { LocationHeading } from "@/components/booking/location-heading";
import { getSalonStorefront } from "@/lib/salon";
import { weekdayLabel } from "@/lib/schedule";
import {
  pageMainClass,
  pageTitleClass,
  sectionTitleClass,
  secondaryButtonClass,
  surfaceClass,
} from "@/lib/ui";
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

  const staffByLocation = salon.locations
    .map((location) => ({
      location,
      staff: salon.staff.filter((person) => person.locationId === location.id),
    }))
    .filter((group) => group.staff.length > 0);

  return (
    <main className={pageMainClass}>
      {salon.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- mixed local paths and owner-pasted http(s) URLs
        <img
          src={salon.coverImageUrl}
          alt={`${salon.name} cover`}
          width={1200}
          height={480}
          className="h-52 w-full rounded-xl object-cover sm:h-72"
        />
      ) : (
        <div className="flex h-40 items-end rounded-xl bg-zinc-100 px-4 py-3 sm:h-48">
          <span className="text-sm font-medium text-zinc-500">{salon.name}</span>
        </div>
      )}

      <div className="space-y-2">
        <Link href="/" className={secondaryButtonClass}>
          Back to search
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Salon</p>
        <h1 className={pageTitleClass}>{salon.name}</h1>
        {salon.phone ? (
          <p className="text-sm text-zinc-600">
            <a href={`tel:${salon.phone.replace(/\s+/g, "")}`} className="hover:text-zinc-900">
              {salon.phone}
            </a>
          </p>
        ) : null}
        {salon.description ? (
          <p className="max-w-2xl whitespace-pre-line text-zinc-700">{salon.description}</p>
        ) : (
          <p className="max-w-2xl text-zinc-700">
            Book services online. Your slot is held when you book; pay at the salon when you
            arrive.
          </p>
        )}
      </div>

      {salon.locations.length > 0 ? (
        <section className="space-y-3">
          <h2 className={sectionTitleClass}>Locations</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {salon.locations.map((location) => (
              <li key={location.id} className={`${surfaceClass} p-4 text-sm text-zinc-700`}>
                <LocationHeading
                  name={location.name}
                  isDefault={location.isDefault}
                  area={location.area}
                />
                {location.address ? (
                  <p className="mt-1 text-zinc-600">{location.address}</p>
                ) : null}
                {location.phone ? (
                  <p className="mt-1 text-zinc-600">
                    <a
                      href={`tel:${location.phone.replace(/\s+/g, "")}`}
                      className="hover:text-zinc-900"
                    >
                      {location.phone}
                    </a>
                  </p>
                ) : null}
                {location.hours.length > 0 ? (
                  <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-zinc-600 sm:grid-cols-2">
                    {location.hours.map((window) => (
                      <li key={window.weekday}>
                        {weekdayLabel(window.weekday)} {window.startTime}–{window.endTime}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-zinc-500">Hours not posted yet.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {staffByLocation.length > 0 ? (
        <section className="space-y-3">
          <h2 className={sectionTitleClass}>Team at this salon</h2>
          <div className="space-y-4">
            {staffByLocation.map(({ location, staff }) => (
              <div key={location.id}>
                {salon.locations.length > 1 ? (
                  <p className="text-sm font-medium text-zinc-700">
                    {location.area ?? location.name}
                  </p>
                ) : null}
                <ul
                  className={`list-inside list-disc text-sm text-zinc-700 ${salon.locations.length > 1 ? "mt-1" : ""}`}
                >
                  {staff.map((person) => (
                    <li key={person.id}>{person.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {salon.categories.length === 0 ? (
        <EmptyState
          title="No bookable services yet"
          description="This salon has not published a catalog."
        >
          <Link href="/" className={secondaryButtonClass}>
            Back to search
          </Link>
        </EmptyState>
      ) : (
        <section className="space-y-3">
          <div>
            <h2 className={sectionTitleClass}>Services</h2>
            <p className="text-sm text-zinc-600">Choose services to continue</p>
          </div>
          <ServicePicker
            orgSlug={orgSlug}
            categories={salon.categories}
            locations={salon.locations.map((location) => ({ id: location.id }))}
            staff={salon.staff}
            initialServiceIds={initialServiceIds}
          />
        </section>
      )}

      {salon.categories.length > 0 ? (
        <div>
          <Link href="/" className={secondaryButtonClass}>
            Back to search
          </Link>
        </div>
      ) : null}
    </main>
  );
}
