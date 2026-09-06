"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AreaFilter } from "@/components/booking/AreaFilter";
import type { MarketplaceCategoryFilter } from "@/lib/marketplace";
import { chipActiveClass, chipClass, controlClass, labelClass, labelTextClass } from "@/lib/ui";

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
    "flex flex-nowrap gap-2 overflow-x-auto scroll-px-3 scroll-py-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 sm:p-4">
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-linear-to-r from-zinc-50 to-transparent sm:hidden"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-linear-to-l from-zinc-50 to-transparent sm:hidden"
          />
          <nav aria-label="Filter by category" className={chipRowClass}>
            <Link
              href={searchHref({ ...current, category: undefined, service: undefined })}
              className={!activeSlug ? chipActiveClass : chipClass}
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
                className={activeSlug === category.slug ? chipActiveClass : chipClass}
                data-testid={`category-${category.slug}`}
              >
                {category.name}
                <span className="ml-1 text-xs opacity-80">({category.salonCount})</span>
              </Link>
            ))}
          </nav>
        </div>
        {services.length > 0 ? (
          <div className="relative border-t border-zinc-200/80 pt-2">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-linear-to-r from-zinc-50 to-transparent sm:hidden"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-linear-to-l from-zinc-50 to-transparent sm:hidden"
            />
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
                    className={active ? chipActiveClass : chipClass}
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
      <div className="grid gap-4 sm:grid-cols-3">
        <AreaFilter
          selectedArea={area ?? ""}
          onAreaChange={(nextArea) => {
            router.push(searchHref({ ...current, area: nextArea || undefined }));
          }}
        />
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
          <span className={labelTextClass}>Preferred time</span>
          <select
            value={time ?? ""}
            disabled={!date}
            aria-describedby="time-filter-help"
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
          <p id="time-filter-help" className="text-xs text-zinc-500">
            {date
              ? "Shows slots within 30 minutes of this time."
              : "Choose a date first to filter by time."}
          </p>
        </label>
      </div>
    </div>
  );
}
