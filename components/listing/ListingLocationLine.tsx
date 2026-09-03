export function ListingLocationLine({
  city,
  area,
}: {
  city?: string | null;
  area?: string | null;
}) {
  const resolvedCity = city?.trim() || "Manila";
  const resolvedArea = area?.trim();

  if (!resolvedArea) {
    return <p className="min-h-5 text-sm text-zinc-600">{resolvedCity}</p>;
  }

  return (
    <p className="min-h-5 text-sm text-zinc-600">
      {`${resolvedCity} · ${resolvedArea}`}
    </p>
  );
}
