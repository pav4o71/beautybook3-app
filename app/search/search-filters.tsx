"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AreaFilter } from "@/components/booking/AreaFilter";
import type { QuickAvailabilityKey } from "@/lib/availability/types";
import { quickFilterHrefParams } from "@/lib/availability/quick-filters";
import type { MarketplaceCategoryFilter } from "@/lib/marketplace";
import { labelClass } from "@/lib/ui";

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

const discoveryChipClass =
  "inline-flex shrink-0 items-center rounded-full border border-emerald-200/90 bg-white/95 px-3.5 py-1.5 text-sm text-emerald-950 shadow-xs transition hover:border-emerald-300 hover:bg-emerald-50/90 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700";

const discoveryChipActiveClass =
  "inline-flex shrink-0 items-center rounded-full bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-white shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900";

const discoveryControlClass =
  "w-full rounded-lg border border-emerald-200/90 bg-white/95 px-3 py-2 text-sm text-emerald-950 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1 focus:border-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-50/50 disabled:text-emerald-400";

const discoveryLabelTextClass = "font-medium text-emerald-950";
const discoveryHelpClass = "text-xs text-emerald-700/80";

function filterLinkClass(active: boolean) {
  return active ? discoveryChipActiveClass : discoveryChipClass;
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

  const chipRowClass = "flex flex-wrap justify-center gap-2 px-1 sm:gap-2.5";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="space-y-3.5 rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/90 via-stone-50/70 to-white p-4 shadow-xs sm:p-5">
        <nav aria-label="Filter by category" className={chipRowClass}>
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
                    className={`${filterLinkClass(active)} shrink-0`}
                    data-testid={`service-chip-${serviceKey(service.name)}`}
                  >
                    {service.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}

        <div className="border-t border-emerald-200/60 pt-3">
          <p className="mb-2 text-center text-xs font-medium text-emerald-800/80">
            Quick availability
          </p>
          <nav aria-label="Quick availability" className={chipRowClass}>
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
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 sm:gap-4">
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
                  avail: event.target.value ? undefined : current.avail,
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
            disabled={!date && avail !== "open"}
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
            {date || avail === "open"
              ? "Shows slots within 30 minutes of this time."
              : "Choose a date first to filter by time."}
          </p>
        </label>
      </div>
    </div>
  );
}
