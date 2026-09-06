import { permanentRedirect } from "next/navigation";
import { firstQueryValue } from "@/lib/validations/booking";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string | string[];
    service?: string | string[];
    area?: string | string[];
    date?: string | string[];
    time?: string | string[];
    serviceId?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["category", "service", "area", "date", "time", "serviceId"] as const) {
    const value = firstQueryValue(query[key])?.trim();
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  permanentRedirect(qs ? `/?${qs}` : "/");
}
