"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AreaFilter } from "@/components/booking/AreaFilter";
import type { MarketplaceCategoryFilter } from "@/lib/marketplace";
import { controlClass, labelClass, labelTextClass } from "@/lib/ui";

const TIME_OPTIONS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
] as const;

function serviceKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function searchHref(input: {
  category?: string;
  service?: string;
  serviceId?: string;
  area?: string;
  date?: string;
  time?: string;
}) {
  const params = new URLSearchParams();
  if (input.category) params.set("category", input.category);
  if (input.service) params.set("service", input.service);
  if (input.serviceId) params.set("serviceId", input.serviceId);
  if (input.area) params.set("area", input.area);
  if (input.date) params.set("date", input.date);
  if (input.time) params.set("time", input.time);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function filterLinkClass(active: boolean) {
  return active
    ? "rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white"
    : "rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50";
}

export function SearchFilters({
  categories,
  services,
  activeSlug,
  activeService,
  serviceId,
  area,
  date,
  time,
  minDate,
}: {
  categories: MarketplaceCategoryFilter[];
  services: { name: string }[];
  activeSlug?: string;
  activeService?: string;
  serviceId?: string;
  area?: string;
  date?: string;
  time?: string;
  minDate: string;
}) {
  const router = useRouter();
  const current = {
    category: activeSlug,
    service: activeService,
    serviceId,
    area,
    date,
    time,
  };

  return (
    <div className="space-y-4">
      <nav aria-label="Filter by category" className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
        <Link
          href={searchHref({ ...current, category: undefined, service: undefined })}
          className={`${filterLinkClass(!activeSlug)} shrink-0`}
          data-testid="category-all"
        >
          All services
        </Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={searchHref({
              ...current,
              category: category.slug,
              service: undefined,
            })}
            className={`${filterLinkClass(activeSlug === category.slug)} shrink-0`}
            data-testid={`category-${category.slug}`}
          >
            {category.name}
            <span className="ml-1 text-xs opacity-80">({category.salonCount})</span>
          </Link>
        ))}
      </nav>
      {services.length > 0 ? (
        <nav aria-label="Filter by service" className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
          {services.map((service) => {
            const active = activeService === service.name;
            return (
              <Link
                key={service.name}
                href={searchHref({
                  ...current,
                  service: active ? undefined : service.name,
                })}
                className={`${filterLinkClass(active)} shrink-0`}
                data-testid={`service-chip-${serviceKey(service.name)}`}
              >
                {service.name}
              </Link>
            );
          })}
        </nav>
      ) : null}
      <AreaFilter
        selectedArea={area ?? ""}
        onAreaChange={(nextArea) => {
          router.push(searchHref({ ...current, area: nextArea || undefined }));
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span className={labelTextClass}>Date</span>
          <input
            type="date"
            min={minDate}
            value={date ?? ""}
            onChange={(event) => {
              router.push(
                searchHref({
                  ...current,
                  date: event.target.value || undefined,
                  time: event.target.value ? time : undefined,
                }),
              );
            }}
            className={controlClass}
            data-testid="date-picker"
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Time</span>
          <select
            value={time ?? ""}
            disabled={!date}
            onChange={(event) => {
              router.push(searchHref({ ...current, time: event.target.value || undefined }));
            }}
            className={controlClass}
            data-testid="time-filter"
          >
            <option value="">Any time</option>
            {TIME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
