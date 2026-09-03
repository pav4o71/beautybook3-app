import { ListingCard, type ListingCardData } from "@/components/listing/ListingCard";
import type { MarketplaceListing } from "@/lib/marketplace";

export function BusinessCard({
  listing,
  serviceName,
}: {
  listing: MarketplaceListing;
  serviceName?: string;
}) {
  const primaryLocation =
    listing.locations.find((location) => location.isDefault) ?? listing.locations[0] ?? null;

  const cardData: ListingCardData = {
    name: listing.name,
    slug: listing.slug,
    listingTier: listing.listingTier,
    coverImageUrl: listing.coverImageUrl,
    photoCount: listing.photoCount,
    tagline: listing.tagline,
    accentColor: listing.accentColor,
    listingTheme: listing.listingTheme,
    featuredService: listing.featuredService,
    cardHighlights: listing.cardHighlights,
    city: primaryLocation?.city ?? "Manila",
    area: primaryLocation?.area ?? null,
    logoUrl: listing.logoUrl,
  };

  return <ListingCard listing={cardData} serviceName={serviceName} />;
}
