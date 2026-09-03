import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { LocationHeading } from "@/components/booking/location-heading";
import { ListingLocationLine } from "@/components/listing/ListingLocationLine";
import { ListingThemeProvider } from "@/components/listing/ListingThemeProvider";
import { isPremiumListing } from "@/lib/listing";
import type { StorefrontSectionId } from "@/lib/listing-layout";
import type { SalonStorefront } from "@/lib/salon";
import { weekdayLabel } from "@/lib/schedule";
import {
  pageTitleClass,
  sectionTitleClass,
  secondaryButtonClass,
  surfaceClass,
  textLinkClass,
} from "@/lib/ui";
import { ServicePicker } from "@/app/s/[orgSlug]/service-picker";

type StorefrontSectionsProps = {
  salon: SalonStorefront;
  orgSlug: string;
  initialServiceIds: string[];
  staffByLocation: {
    location: SalonStorefront["locations"][number];
    staff: SalonStorefront["staff"];
  }[];
};

export function StorefrontSections({
  salon,
  orgSlug,
  initialServiceIds,
  staffByLocation,
}: StorefrontSectionsProps) {
  const premium = isPremiumListing(salon.listingTier);
  const primaryLocation =
    salon.locations.find((l) => l.isDefault) ?? salon.locations[0] ?? null;

  const socialLinks = [
    salon.websiteUrl ? { label: "Website", href: salon.websiteUrl } : null,
    salon.instagramUrl ? { label: "Instagram", href: salon.instagramUrl } : null,
    salon.facebookUrl ? { label: "Facebook", href: salon.facebookUrl } : null,
  ].filter((link): link is { label: string; href: string } => link != null);

  const sectionRenderers: Record<StorefrontSectionId, () => ReactNode> = {
    hero: () => (
      <div className="relative" key="hero">
        {salon.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={salon.logoUrl}
            alt={`${salon.name} logo`}
            width={80}
            height={80}
            className="absolute -bottom-8 left-4 size-20 rounded-full border-4 border-white bg-white object-cover shadow-sm sm:left-6"
          />
        ) : null}
        <div className={`space-y-2 ${salon.logoUrl ? "pt-10" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={pageTitleClass}>{salon.name}</h1>
            {premium ? (
              <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">
                Premium
              </span>
            ) : null}
          </div>
          {salon.tagline ? (
            <p className="max-w-2xl text-lg opacity-90">{salon.tagline}</p>
          ) : null}
          {primaryLocation ? (
            <ListingLocationLine city={primaryLocation.city} area={primaryLocation.area} />
          ) : null}
        </div>
      </div>
    ),
    about: () => (
      <section key="about" className="space-y-2">
        {salon.phone ? (
          <p className="text-sm opacity-80">
            <a href={`tel:${salon.phone.replace(/\s+/g, "")}`} className="hover:opacity-100">
              {salon.phone}
            </a>
          </p>
        ) : null}
        {salon.description ? (
          <p className="max-w-2xl whitespace-pre-line opacity-90">{salon.description}</p>
        ) : (
          <p className="max-w-2xl opacity-90">
            Book services online. Your slot is held when you book; pay at the salon when you
            arrive.
          </p>
        )}
      </section>
    ),
    highlights: () =>
      salon.highlights.length > 0 ? (
        <section key="highlights" className="space-y-2">
          <h2 className={sectionTitleClass}>Highlights</h2>
          <ul className="max-w-2xl list-inside list-disc text-sm opacity-90">
            {salon.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>
      ) : null,
    gallery: () =>
      premium && salon.photos.length > 0 ? (
        <section key="gallery" className="space-y-3">
          <h2 className={sectionTitleClass}>Gallery</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {salon.photos.map((photo) => (
              <li key={photo.id} className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? ""}
                  width={320}
                  height={240}
                  className="h-36 w-full rounded-lg object-cover"
                />
                {photo.caption ? (
                  <p className="text-xs opacity-70">{photo.caption}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null,
    locations: () =>
      salon.locations.length > 0 ? (
        <section key="locations" className="space-y-3">
          <h2 className={sectionTitleClass}>Locations</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {salon.locations.map((location) => (
              <li key={location.id} className={`${surfaceClass} p-4 text-sm opacity-90`}>
                <LocationHeading
                  name={location.name}
                  isDefault={location.isDefault}
                  area={location.area}
                />
                <ListingLocationLine city={location.city} area={location.area} />
                {location.address ? (
                  <p className="mt-1 opacity-80">{location.address}</p>
                ) : null}
                {location.phone ? (
                  <p className="mt-1 opacity-80">
                    <a
                      href={`tel:${location.phone.replace(/\s+/g, "")}`}
                      className="hover:opacity-100"
                    >
                      {location.phone}
                    </a>
                  </p>
                ) : null}
                {location.hours.length > 0 ? (
                  <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs opacity-80 sm:grid-cols-2">
                    {location.hours.map((window) => (
                      <li key={window.weekday}>
                        {weekdayLabel(window.weekday)} {window.startTime}–{window.endTime}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs opacity-60">Hours not posted yet.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null,
    staff: () =>
      staffByLocation.length > 0 ? (
        <section key="staff" className="space-y-3">
          <h2 className={sectionTitleClass}>Team at this salon</h2>
          <div className="space-y-4">
            {staffByLocation.map(({ location, staff }) => (
              <div key={location.id}>
                {salon.locations.length > 1 ? (
                  <p className="text-sm font-medium opacity-90">
                    {location.area ?? location.name}
                  </p>
                ) : null}
                <ul
                  className={`list-inside list-disc text-sm opacity-90 ${salon.locations.length > 1 ? "mt-1" : ""}`}
                >
                  {staff.map((person) => (
                    <li key={person.id}>{person.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null,
    services: () =>
      salon.categories.length === 0 ? (
        <EmptyState
          key="services-empty"
          title="No bookable services yet"
          description="This salon has not published a catalog."
        >
          <Link href="/" className={secondaryButtonClass}>
            Back to search
          </Link>
        </EmptyState>
      ) : (
        <section key="services" className="space-y-3">
          <div>
            <h2 className={sectionTitleClass}>Services</h2>
            <p className="text-sm opacity-80">Choose services to continue</p>
          </div>
          <ServicePicker
            orgSlug={orgSlug}
            categories={salon.categories}
            locations={salon.locations.map((location) => ({ id: location.id }))}
            staff={salon.staff}
            initialServiceIds={initialServiceIds}
          />
        </section>
      ),
    social: () =>
      premium && socialLinks.length > 0 ? (
        <section key="social" className="space-y-2">
          <h2 className={sectionTitleClass}>Connect</h2>
          <div className="flex flex-wrap gap-3">
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
        </section>
      ) : null,
  };

  return (
    <ListingThemeProvider
      listingTheme={salon.listingTheme}
      accentColor={salon.accentColor}
      tier={salon.listingTier}
      className="space-y-8"
    >
      {salon.layout.map((sectionId) => {
        const renderer = sectionRenderers[sectionId];
        return renderer ? renderer() : null;
      })}
    </ListingThemeProvider>
  );
}
