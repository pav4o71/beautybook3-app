import { isPremiumListing } from "@/lib/listing";

export function ListingCardMedia({
  coverImageUrl,
  photoCount,
  listingTier,
  name,
  salonHref,
  focusRingClass,
}: {
  coverImageUrl: string | null;
  photoCount: number;
  listingTier: Parameters<typeof isPremiumListing>[0];
  name: string;
  salonHref: string;
  focusRingClass: string;
}) {
  const premium = isPremiumListing(listingTier);
  const extraPhotos = premium ? Math.max(0, photoCount - 1) : 0;

  return (
    <a href={salonHref} className={`relative block shrink-0 ${focusRingClass}`}>
      {coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- mixed local paths and owner-pasted http(s) URLs
        <img
          src={coverImageUrl}
          alt={`${name} cover`}
          width={800}
          height={400}
          loading="lazy"
          className="h-44 w-full object-cover sm:h-48"
          data-testid="listing-card-cover"
        />
      ) : (
        <div className="flex h-44 items-end bg-zinc-100 px-4 py-3 sm:h-48">
          <span className="text-sm font-medium text-zinc-500">{name}</span>
        </div>
      )}
      {premium && extraPhotos > 0 ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-zinc-900/80 px-2 py-0.5 text-xs font-medium text-white">
          +{extraPhotos} photo{extraPhotos === 1 ? "" : "s"}
        </span>
      ) : null}
    </a>
  );
}
