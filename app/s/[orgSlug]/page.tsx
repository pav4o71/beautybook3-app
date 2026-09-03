import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { LocationHeading } from "@/components/booking/location-heading";
import { isPremiumListing } from "@/lib/listing";
import { getSalonStorefront } from "@/lib/salon";
import { weekdayLabel } from "@/lib/schedule";
import {
  pageMainClass,
  pageTitleClass,
  sectionTitleClass,
  secondaryButtonClass,
  surfaceClass,
  textLinkClass,
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

  const premium = isPremiumListing(salon.listingTier);
  const socialLinks = [
    salon.websiteUrl ? { label: "Website", href: salon.websiteUrl } : null,
    salon.instagramUrl ? { label: "Instagram", href: salon.instagramUrl } : null,
    salon.facebookUrl ? { label: "Facebook", href: salon.facebookUrl } : null,
  ].filter((link): link is { label: string; href: string } => link != null);

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
      <div className="relative">
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
        {salon.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- mixed local paths and owner-pasted http(s) URLs
          <img
            src={salon.logoUrl}
            alt={`${salon.name} logo`}
            width={80}
            height={80}
            className="absolute -bottom-8 left-4 size-20 rounded-full border-4 border-white bg-white object-cover shadow-sm sm:left-6"
          />
        ) : null}
      </div>

      <div className={`space-y-2 ${salon.logoUrl ? "pt-10" : ""}`}>
        <Link href="/" className={secondaryButtonClass}>
          Back to search
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Salon</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className={pageTitleClass}>{salon.name}</h1>
          {premium ? (
            <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">
              Premium
            </span>
          ) : null}
        </div>
        {salon.tagline ? (
          <p className="max-w-2xl text-lg text-zinc-700">{salon.tagline}</p>
        ) : null}
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
        {salon.highlights.length > 0 ? (
          <ul className="max-w-2xl list-inside list-disc text-sm text-zinc-700">
            {salon.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        ) : null}
        {premium && socialLinks.length > 0 ? (
          <div className="flex flex-wrap gap-3 pt-1">
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={textLinkClass}
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      {premium && salon.galleryUrls.length > 0 ? (
        <section className="space-y-3">
          <h2 className={sectionTitleClass}>Gallery</h2>
          <ul className="flex gap-3 overflow-x-auto pb-2">
            {salon.galleryUrls.map((url) => (
              <li key={url} className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- mixed local paths and owner-pasted http(s) URLs */}
                <img
                  src={url}
                  alt=""
                  width={240}
                  height={180}
                  className="h-36 w-48 rounded-lg object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
