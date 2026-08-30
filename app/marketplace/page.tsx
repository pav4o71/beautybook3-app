import { permanentRedirect } from "next/navigation";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; area?: string }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.area) params.set("area", query.area);
  const qs = params.toString();
  permanentRedirect(qs ? `/?${qs}` : "/");
}
