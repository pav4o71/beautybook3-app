import Link from "next/link";
import { ListingCardMedia } from "@/components/listing/ListingCardMedia";
import { ListingLocationLine } from "@/components/listing/ListingLocationLine";
import { formatPrice } from "@/lib/format";
import type { ListingFeaturedService } from "@/lib/listing";
import { isPremiumListing } from "@/lib/listing";
import { resolveListingTheme, themeCardBorderStyle } from "@/lib/listing-theme";
import type { ListingTier } from "@/app/generated/prisma/enums";
import {
  chipClass,
  focusRingClass,
  primaryButtonClass,
  surfaceInteractiveClass,
} from "@/lib/ui";

export type ListingCardData = {
  name: string;
  slug: string;
  listingTier: ListingTier;
  coverImageUrl: string | null;
  photoCount: number;
  tagline?: string | null;
  accentColor?: string | null;
  listingTheme?: unknown;
  featuredService: ListingFeaturedService | null;
  cardHighlights: string[];
  city: string | null;
  area: string | null;
  logoUrl?: string | null;
};

export function ListingCard({
  listing,
  serviceName,
  preview = false,
}: {
  listing: ListingCardData;
  serviceName?: string;
  preview?: boolean;
}) {
  const premium = isPremiumListing(listing.listingTier);
  const theme = resolveListingTheme(
    listing.listingTheme,
    listing.accentColor ?? null,
    listing.listingTier,
  );
  const salonHref = serviceName
    ? `/s/${listing.slug}?service=${encodeURIComponent(serviceName)}`
    : `/s/${listing.slug}`;

  const Wrapper = preview ? "div" : "article";

  return (
    <Wrapper
      className={`${surfaceInteractiveClass} bb-card-lift relative flex h-full flex-col overflow-hidden ${premium ? "!border-2" : ""}`}
      style={{
        ...themeCardBorderStyle(theme, listing.listingTier),
        ...(premium
          ? {
              backgroundColor: theme.backgroundColor,
              color: theme.textColor,
            }
          : undefined),
      }}
      data-testid={`business-${listing.slug}`}
    >
      {premium ? (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">
          Premium
        </span>
      ) : null}

      {preview ? (
        <ListingCardMedia
          coverImageUrl={listing.coverImageUrl}
          photoCount={listing.photoCount}
          listingTier={listing.listingTier}
          name={listing.name}
          salonHref={salonHref}
          focusRingClass={focusRingClass}
        />
      ) : (
        <Link href={salonHref} className={`relative block shrink-0 ${focusRingClass}`}>
          {listing.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.coverImageUrl}
              alt={`${listing.name} cover`}
              width={800}
              height={400}
              loading="lazy"
              className="h-44 w-full object-cover sm:h-48"
              data-testid={`business-cover-${listing.slug}`}
            />
          ) : (
            <div className="flex h-44 items-end bg-zinc-100 px-4 py-3 sm:h-48">
              <span className="text-sm font-medium text-zinc-500">{listing.name}</span>
            </div>
          )}
          {listing.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.logoUrl}
              alt={`${listing.name} logo`}
              width={56}
              height={56}
              className="absolute bottom-3 left-3 size-14 rounded-full border-2 border-white bg-white object-cover shadow-sm"
              data-testid={`business-logo-${listing.slug}`}
            />
          ) : null}
          {premium && listing.photoCount > 1 ? (
            <span className="absolute bottom-2 right-2 rounded-full bg-zinc-900/80 px-2 py-0.5 text-xs font-medium text-white">
              +{listing.photoCount - 1} photo{listing.photoCount - 1 === 1 ? "" : "s"}
            </span>
          ) : null}
        </Link>
      )}

      <div className="flex flex-1 flex-col p-4">
        {preview ? (
          <h2
            className={`line-clamp-1 text-lg font-semibold tracking-tight ${premium ? "" : "text-zinc-900"}`}
          >
            {listing.name}
          </h2>
        ) : (
          <Link href={salonHref} className={`inline-block rounded-sm ${focusRingClass}`}>
            <h2
              className={`line-clamp-1 text-lg font-semibold tracking-tight ${premium ? "hover:opacity-80" : "text-zinc-900 hover:text-zinc-700"}`}
            >
              {listing.name}
            </h2>
          </Link>
        )}

        {listing.tagline ? (
          <p className={`mt-0.5 line-clamp-1 text-sm ${premium ? "opacity-80" : "text-zinc-600"}`}>
            {listing.tagline}
          </p>
        ) : (
          <p className="mt-0.5 min-h-5" aria-hidden="true" />
        )}

        {listing.featuredService ? (
          <p className={`mt-1 line-clamp-1 text-sm ${premium ? "opacity-80" : "text-zinc-600"}`}>
            From{" "}
            <span className={`font-medium ${premium ? "" : "text-zinc-900"}`}>
              {formatPrice(listing.featuredService.priceCents)}
            </span>
            {" · "}
            {listing.featuredService.name}
          </p>
        ) : (
          <p className={`mt-1 min-h-5 text-sm ${premium ? "opacity-60" : "text-zinc-500"}`}>
            No bookable services yet
          </p>
        )}

        <div className={premium ? "opacity-80" : ""}>
          <ListingLocationLine city={listing.city} area={listing.area} />
        </div>

        {listing.cardHighlights.length > 0 ? (
          premium ? (
            <ul className="mt-2 flex min-h-7 flex-wrap gap-1.5">
              {listing.cardHighlights.map((highlight) => (
                <li key={highlight} className={chipClass}>
                  {highlight}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-2 min-h-7 list-inside list-disc text-sm text-zinc-600">
              {listing.cardHighlights.map((highlight) => (
                <li key={highlight} className="line-clamp-1">
                  {highlight}
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="mt-2 min-h-7" aria-hidden="true" />
        )}

        <div className="mt-4">
          {preview ? (
            <span className={primaryButtonClass}>View salon</span>
          ) : (
            <Link
              href={salonHref}
              className={primaryButtonClass}
              data-testid={`book-now-${listing.slug}`}
            >
              View salon
            </Link>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
