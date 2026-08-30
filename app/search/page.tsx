import { permanentRedirect } from "next/navigation";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    service?: string;
    area?: string;
    date?: string;
    time?: string;
    serviceId?: string;
  }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["category", "service", "area", "date", "time", "serviceId"] as const) {
    const value = query[key]?.trim();
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  permanentRedirect(qs ? `/?${qs}` : "/");
}
