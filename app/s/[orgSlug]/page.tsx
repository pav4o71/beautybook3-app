import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { LocationHeading } from "@/components/booking/location-heading";
import { getSalonStorefront } from "@/lib/salon";
import { weekdayLabel } from "@/lib/schedule";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { firstQueryValue } from "@/lib/validations/booking";
import { ServicePicker } from "./service-picker";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function SalonLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ service?: string | string[] }>;
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const salon = await getSalonStorefront(orgSlug);

  if (!salon) {
    notFound();
  }

  const rawService = firstQueryValue(query.service);
  const preselectName = rawService?.trim().toLowerCase();
  const initialServiceIds = preselectName
    ? salon.categories
        .flatMap((category) => category.services)
        .filter((service) => service.name.toLowerCase() === preselectName)
        .map((service) => service.id)
    : [];

  const hasServices = salon.categories.length > 0;

  const staffByLocation = salon.locations
    .map((location) => ({
      location,
      staff: salon.staff.filter((person) => person.locationId === location.id),
    }))
    .filter((group) => group.staff.length > 0);

  const staffWithLocation = new Set(
    staffByLocation.flatMap((g) => g.staff.map((s) => s.id)),
  );
  const unassignedStaff = salon.staff.filter(
    (person) => !staffWithLocation.has(person.id),
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
        >
          <span aria-hidden="true">←</span> Back to search
        </Link>
      </nav>

      {salon.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- mixed local paths and owner-pasted http(s) URLs
        <img
          src={salon.coverImageUrl}
          alt={`${salon.name} cover`}
          width={1200}
          height={480}
          className="h-48 w-full rounded-2xl border border-zinc-200/70 object-cover shadow-xs sm:h-64 md:h-72"
        />
      ) : (
        <div className="flex h-36 items-end rounded-2xl border border-zinc-200/60 bg-gradient-to-br from-emerald-50/50 via-zinc-100 to-zinc-200/80 px-6 py-4 sm:h-48">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {salon.name}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Salon
            </span>
          </div>
          <h1 className="break-words text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {salon.name}
          </h1>
          {salon.phone ? (
            <p className="text-sm text-zinc-600">
              <a
                href={`tel:${salon.phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-emerald-700"
              >
                <svg
                  className="size-4 text-zinc-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.484 1.276l.74 4.435a1.5 1.5 0 01-.54 1.36l-1.32 1.055a11.042 11.042 0 005.516 5.516l1.055-1.32a1.5 1.5 0 011.36-.54l4.435.74a1.5 1.5 0 011.276 1.484V16.5a1.5 1.5 0 01-1.5 1.5h-1.5C8.077 18 2 11.923 2 4.5v-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {salon.phone}
              </a>
            </p>
          ) : null}
          {salon.description ? (
            <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-zinc-600 sm:text-base">
              {salon.description}
            </p>
          ) : (
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
              Book services online. Your slot is held when you book; pay at the salon when
              you arrive.
            </p>
          )}
        </div>
        {hasServices ? (
          <div className="shrink-0 pt-1">
            <Link
              href="#services"
              className={`${primaryButtonClass} w-full shadow-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 sm:w-auto`}
              data-testid="salon-book-cta"
            >
              Book now
            </Link>
          </div>
        ) : null}
      </div>

      {salon.locations.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Locations
            </h2>
            <span className="text-xs font-medium text-zinc-500">
              {salon.locations.length}{" "}
              {salon.locations.length === 1 ? "branch" : "branches"}
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {salon.locations.map((location) => (
              <li
                key={location.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-4 text-sm text-zinc-700 shadow-xs transition hover:border-zinc-300"
              >
                <div>
                  <LocationHeading
                    name={location.name}
                    isDefault={location.isDefault}
                    area={location.area}
                  />
                  {location.address ? (
                    <p className="mt-1.5 text-zinc-600">{location.address}</p>
                  ) : null}
                  {location.phone ? (
                    <p className="mt-1.5 text-zinc-600">
                      <a
                        href={`tel:${location.phone.replace(/\s+/g, "")}`}
                        className="inline-flex items-center gap-1 transition-colors hover:text-emerald-700"
                      >
                        <svg
                          className="size-3.5 text-zinc-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.484 1.276l.74 4.435a1.5 1.5 0 01-.54 1.36l-1.32 1.055a11.042 11.042 0 005.516 5.516l1.055-1.32a1.5 1.5 0 011.36-.54l4.435.74a1.5 1.5 0 011.276 1.484V16.5a1.5 1.5 0 01-1.5 1.5h-1.5C8.077 18 2 11.923 2 4.5v-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {location.phone}
                      </a>
                    </p>
                  ) : null}
                </div>
                {location.hours.length > 0 ? (
                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Hours
                    </p>
                    <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-zinc-600 sm:grid-cols-2">
                      {location.hours.map((window) => (
                        <li
                          key={window.weekday}
                          className="flex justify-between sm:justify-start sm:gap-2"
                        >
                          <span className="font-medium text-zinc-700">
                            {weekdayLabel(window.weekday)}
                          </span>
                          <span>
                            {window.startTime}–{window.endTime}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-zinc-400">Hours not posted yet.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {salon.staff.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Our Team
            </h2>
            <span className="text-xs font-medium text-zinc-500">
              {salon.staff.length}{" "}
              {salon.staff.length === 1 ? "specialist" : "specialists"}
            </span>
          </div>
          <div className="space-y-4">
            {staffByLocation.map(({ location, staff }) => (
              <div key={location.id} className="space-y-2">
                {salon.locations.length > 1 ? (
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {location.area ?? location.name}
                  </h3>
                ) : null}
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {staff.map((person) => (
                    <li
                      key={person.id}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200/70 bg-white p-3 shadow-xs transition hover:border-zinc-300"
                    >
                      {person.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={person.photoUrl}
                          alt=""
                          className="size-10 shrink-0 rounded-full object-cover ring-2 ring-emerald-600/20"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200/70"
                        >
                          {getInitials(person.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {person.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {person.serviceIds.length}{" "}
                          {person.serviceIds.length === 1 ? "service" : "services"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {unassignedStaff.length > 0 ? (
              <div className="space-y-2">
                {salon.locations.length > 1 ? (
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    All locations
                  </h3>
                ) : null}
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {unassignedStaff.map((person) => (
                    <li
                      key={person.id}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200/70 bg-white p-3 shadow-xs transition hover:border-zinc-300"
                    >
                      {person.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={person.photoUrl}
                          alt=""
                          className="size-10 shrink-0 rounded-full object-cover ring-2 ring-emerald-600/20"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200/70"
                        >
                          {getInitials(person.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {person.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {person.serviceIds.length}{" "}
                          {person.serviceIds.length === 1 ? "service" : "services"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {hasServices ? (
        <section id="services" className="space-y-4 pt-2">
          <div className="border-b border-zinc-200/80 pb-3">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Services &amp; Pricing
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Choose services to book an appointment
            </p>
          </div>
          <ServicePicker
            orgSlug={orgSlug}
            categories={salon.categories}
            locations={salon.locations.map((location) => ({ id: location.id }))}
            staff={salon.staff}
            initialServiceIds={initialServiceIds}
          />
        </section>
      ) : (
        <EmptyState
          title="No bookable services yet"
          description="This salon has not published their services yet."
        >
          <Link href="/" className={secondaryButtonClass}>
            Back to search
          </Link>
        </EmptyState>
      )}

      <div className="pt-2">
        <Link href="/" className={secondaryButtonClass}>
          ← Back to search
        </Link>
      </div>
    </main>
  );
}

