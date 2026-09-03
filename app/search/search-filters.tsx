"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AreaFilter } from "@/components/booking/AreaFilter";
import type { MarketplaceCategoryFilter } from "@/lib/marketplace";
import { labelClass } from "@/lib/ui";

const discoveryChipClass =
  "inline-flex shrink-0 items-center rounded-full border border-emerald-200/90 bg-white/90 px-3.5 py-1.5 text-sm text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/90 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600";

const discoveryChipActiveClass =
  "inline-flex shrink-0 items-center rounded-full bg-emerald-800 px-3.5 py-1.5 text-sm font-medium text-emerald-50 shadow-md shadow-emerald-900/20 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-200";

const discoveryControlClass =
  "w-full rounded-lg border border-emerald-200/90 bg-white/95 px-3 py-2 text-sm text-emerald-950 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus:border-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-50/50 disabled:text-emerald-400";

const discoveryLabelTextClass = "font-medium text-emerald-950";

const discoveryHelpClass = "text-xs text-emerald-700/70";

const TIME_OPTIONS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
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

  const chipRowClass =
    "flex flex-wrap justify-center gap-2 px-1 sm:gap-2.5";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="space-y-3 rounded-2xl border border-emerald-200/70 bg-linear-to-b from-emerald-50/90 via-stone-50/70 to-white p-4 shadow-sm sm:p-5">
        <nav aria-label="Filter by category" className={chipRowClass}>
            <Link
              href={searchHref({ ...current, category: undefined, service: undefined })}
              className={!activeSlug ? discoveryChipActiveClass : discoveryChipClass}
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
                className={activeSlug === category.slug ? discoveryChipActiveClass : discoveryChipClass}
                data-testid={`category-${category.slug}`}
              >
                {category.name}
                <span className="ml-1 text-xs opacity-80">({category.salonCount})</span>
              </Link>
            ))}
        </nav>
        {services.length > 0 ? (
          <div className="border-t border-emerald-200/60 pt-3">
            <nav aria-label="Filter by service" className={chipRowClass}>
              {services.map((service) => {
                const active =
                  activeService != null &&
                  activeService.toLowerCase() === service.name.toLowerCase();
                return (
                  <Link
                    key={service.name}
                    href={searchHref({
                      ...current,
                      service: active ? undefined : service.name,
                    })}
                    className={active ? discoveryChipActiveClass : discoveryChipClass}
                    data-testid={`service-chip-${serviceKey(service.name)}`}
                  >
                    {service.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        <AreaFilter
          selectedArea={area ?? ""}
          onAreaChange={(nextArea) => {
            router.push(searchHref({ ...current, area: nextArea || undefined }));
          }}
          controlClassName={discoveryControlClass}
          labelTextClassName={discoveryLabelTextClass}
          helpClassName={discoveryHelpClass}
        />
        <label className={labelClass}>
          <span className={discoveryLabelTextClass}>Date</span>
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
            className={discoveryControlClass}
            data-testid="date-picker"
          />
        </label>
        <label className={labelClass}>
          <span className={discoveryLabelTextClass}>Preferred time</span>
          <select
            value={time ?? ""}
            disabled={!date}
            aria-describedby="time-filter-help"
            onChange={(event) => {
              router.push(searchHref({ ...current, time: event.target.value || undefined }));
            }}
            className={discoveryControlClass}
            data-testid="time-filter"
          >
            <option value="">Any time</option>
            {TIME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p id="time-filter-help" className={discoveryHelpClass}>
            {date
              ? "Shows slots within 30 minutes of this time."
              : "Choose a date first to filter by time."}
          </p>
        </label>
      </div>
    </div>
  );
}
