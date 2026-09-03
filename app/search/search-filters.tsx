"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AreaFilter } from "@/components/booking/AreaFilter";
import type { QuickAvailabilityKey } from "@/lib/availability/types";
import { quickFilterHrefParams } from "@/lib/availability/quick-filters";
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

const QUICK_AVAILABILITY: { key: QuickAvailabilityKey; label: string }[] = [
  { key: "today", label: "Available today" },
  { key: "tomorrow", label: "Available tomorrow" },
  { key: "weekend", label: "This weekend" },
  { key: "open", label: "Open now" },
  { key: "earliest", label: "Earliest available" },
];

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
  avail?: string;
}) {
  const params = new URLSearchParams();
  if (input.category) params.set("category", input.category);
  if (input.service) params.set("service", input.service);
  if (input.serviceId) params.set("serviceId", input.serviceId);
  if (input.area) params.set("area", input.area);
  if (input.date) params.set("date", input.date);
  if (input.time) params.set("time", input.time);
  if (input.avail) params.set("avail", input.avail);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function filterLinkClass(active: boolean) {
  return active
    ? "rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
    : "rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";
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
  avail,
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
  avail?: QuickAvailabilityKey;
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
    avail,
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-900">What would you like to book?</p>
        <nav aria-label="Filter by category" className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
          <Link
            href={searchHref({
              ...current,
              category: undefined,
              service: undefined,
              avail: undefined,
              date: undefined,
              time: undefined,
            })}
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
      </div>
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
      <nav aria-label="Quick availability" className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
        {QUICK_AVAILABILITY.map((option) => {
          const active = avail === option.key;
          const params = quickFilterHrefParams(option.key);
          return (
            <Link
              key={option.key}
              href={
                active
                  ? searchHref({
                      ...current,
                      avail: undefined,
                      date: undefined,
                      time: undefined,
                    })
                  : searchHref({
                      category: current.category,
                      service: current.service,
                      serviceId: current.serviceId,
                      area: current.area,
                      ...params,
                    })
              }
              className={`${filterLinkClass(active)} shrink-0`}
              data-testid={`avail-${option.key}`}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>
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
                  avail: event.target.value ? undefined : current.avail,
                }),
              );
            }}
            className={controlClass}
            data-testid="date-picker"
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Preferred time</span>
          <select
            value={time ?? ""}
            disabled={!date && avail !== "open"}
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
