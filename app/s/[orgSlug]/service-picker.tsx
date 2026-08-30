"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_BOOKING_SERVICES,
  MAX_COMBINED_DURATION_MIN,
  NO_STAFF_FOR_COMBINATION,
  firstLocationWithCapableStaff,
} from "@/lib/booking-limits";
import { formatPrice } from "@/lib/format";
import { checkboxClass, primaryButtonClass } from "@/lib/ui";

type PickerService = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
};

type PickerCategory = {
  id: string;
  name: string;
  services: PickerService[];
};

type PickerStaff = {
  id: string;
  locationId: string;
  serviceIds: string[];
};

type PickerLocation = {
  id: string;
};

export function ServicePicker({
  orgSlug,
  categories,
  locations,
  staff,
  initialServiceIds,
}: {
  orgSlug: string;
  categories: PickerCategory[];
  locations: PickerLocation[];
  staff: PickerStaff[];
  initialServiceIds: string[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(initialServiceIds);

  const services = useMemo(
    () => categories.flatMap((category) => category.services),
    [categories],
  );

  const selected = useMemo(
    () => services.filter((service) => selectedIds.includes(service.id)),
    [selectedIds, services],
  );

  const totalMinutes = selected.reduce((sum, service) => sum + service.durationMin, 0);
  const totalCents = selected.reduce((sum, service) => sum + service.priceCents, 0);
  const overServiceCap = selectedIds.length > MAX_BOOKING_SERVICES;
  const overDurationCap = totalMinutes > MAX_COMBINED_DURATION_MIN;
  const capableLocationId = firstLocationWithCapableStaff(locations, staff, selectedIds);
  const hasCapableStaff = Boolean(capableLocationId);

  const continueDisabled =
    selectedIds.length === 0 || overServiceCap || overDurationCap || !hasCapableStaff;

  function toggleService(serviceId: string) {
    setSelectedIds((current) => {
      if (current.includes(serviceId)) {
        return current.filter((id) => id !== serviceId);
      }
      if (current.length >= MAX_BOOKING_SERVICES) {
        return current;
      }
      return [...current, serviceId];
    });
  }

  function continueToBook() {
    const firstServiceId = selectedIds[0];
    if (continueDisabled || !capableLocationId || !firstServiceId) {
      return;
    }
    const params = new URLSearchParams();
    params.set("serviceId", firstServiceId);
    if (selectedIds.length > 1) {
      params.set("serviceIds", selectedIds.join(","));
    }
    params.set("locationId", capableLocationId);
    router.push(`/s/${orgSlug}/book?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <section key={category.id} className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            {category.name}
          </h2>
          <ul className="space-y-2">
            {category.services.map((service) => {
              const checked = selectedIds.includes(service.id);
              const atCap = !checked && selectedIds.length >= MAX_BOOKING_SERVICES;
              return (
                <li key={service.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                      checked
                        ? "border-zinc-900 bg-zinc-50"
                        : "border-zinc-200 bg-white"
                    } ${atCap ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className={`${checkboxClass} mt-1`}
                      checked={checked}
                      disabled={atCap}
                      onChange={() => toggleService(service.id)}
                      data-testid={`service-checkbox-${service.name}`}
                    />
                    <span className="flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium text-zinc-900">{service.name}</span>
                        <span className="text-sm text-zinc-700">
                          {formatPrice(service.priceCents)} · {service.durationMin} min
                        </span>
                      </span>
                      {service.description ? (
                        <span className="mt-1 block text-sm text-zinc-600">
                          {service.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-700">
            {selected.length === 0 ? (
              "Select at least one service"
            ) : (
              <>
                {selected.length} service{selected.length === 1 ? "" : "s"} · {totalMinutes}{" "}
                min · {formatPrice(totalCents)}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={continueToBook}
            disabled={continueDisabled}
            className={primaryButtonClass}
            data-testid="continue-booking"
          >
            Continue
          </button>
        </div>
        {selectedIds.length > 0 && !hasCapableStaff ? (
          <p className="mx-auto mt-2 w-full max-w-5xl text-sm text-red-700">
            {NO_STAFF_FOR_COMBINATION}
          </p>
        ) : null}
        {overDurationCap ? (
          <p className="mx-auto mt-2 w-full max-w-5xl text-sm text-red-700">
            Combined duration cannot exceed {MAX_COMBINED_DURATION_MIN} minutes.
          </p>
        ) : null}
      </div>
    </div>
  );
}
