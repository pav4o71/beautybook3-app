"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ActionFormState } from "@/lib/action-form-state";
import {
  MAX_BOOKING_SERVICES,
  MAX_COMBINED_DURATION_MIN,
  NO_STAFF_FOR_COMBINATION,
  staffOffersAllServices,
} from "@/lib/booking-limits";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import {
  cardButtonClass,
  cardButtonSelectedClass,
  slotButtonClass,
  successAlertClass,
} from "@/lib/ui";
import { bookSlot } from "./actions";

type ServiceOption = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  categoryName: string;
};

type StaffOption = {
  id: string;
  name: string;
  serviceIds: string[];
};

type SlotGroup = {
  day: string;
  slots: string[];
};

type LocationOption = {
  id: string;
  name: string;
};

export function BookingForm({
  services,
  staff,
  locations = [],
  initialServiceIds,
  initialStaffId,
  initialLocationId = "",
  initialStartsAt = "",
  slots,
  action = bookSlot,
  bookPath = "/dashboard/book",
}: {
  services: ServiceOption[];
  staff: StaffOption[];
  locations?: LocationOption[];
  initialServiceIds: string[];
  initialStaffId: string;
  initialLocationId?: string;
  initialStartsAt?: string;
  slots: string[];
  action?: (formData: FormData) => Promise<ActionFormState>;
  bookPath?: string;
}) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(initialLocationId);
  const [selectedIds, setSelectedIds] = useState(initialServiceIds);
  const [staffId, setStaffId] = useState(initialStaffId);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const availableStaff = useMemo(
    () => staff.filter((person) => staffOffersAllServices(person.serviceIds, selectedIds)),
    [selectedIds, staff],
  );

  const selectedServices = services.filter((service) => selectedIds.includes(service.id));
  const totalMinutes = selectedServices.reduce(
    (sum, service) => sum + service.durationMin,
    0,
  );
  const totalCents = selectedServices.reduce((sum, service) => sum + service.priceCents, 0);
  const overDurationCap = totalMinutes > MAX_COMBINED_DURATION_MIN;
  const overServiceCap = selectedIds.length > MAX_BOOKING_SERVICES;

  const groupedSlots = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const iso of slots) {
      const date = new Date(iso);
      const key = formatDay(date);
      const list = groups.get(key) ?? [];
      list.push(iso);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).map(([day, daySlots]) => ({
      day,
      slots: daySlots,
    })) satisfies SlotGroup[];
  }, [slots]);

  function updateQuery(
    nextLocationId: string,
    nextServiceIds: string[],
    nextStaffId: string,
  ) {
    const params = new URLSearchParams();
    if (nextLocationId) params.set("locationId", nextLocationId);
    if (nextServiceIds.length > 0) {
      params.set("serviceId", nextServiceIds[0]);
    }
    if (nextServiceIds.length > 1) {
      params.set("serviceIds", nextServiceIds.join(","));
    }
    if (nextStaffId) params.set("staffId", nextStaffId);
    router.push(`${bookPath}?${params.toString()}`);
  }

  function selectLocation(nextLocationId: string) {
    setLocationId(nextLocationId);
    setStaffId("");
    setMessage(null);
    updateQuery(nextLocationId, selectedIds, "");
  }

  function toggleService(nextServiceId: string) {
    const exists = selectedIds.includes(nextServiceId);
    const next = exists
      ? selectedIds.filter((id) => id !== nextServiceId)
      : [...selectedIds, nextServiceId];
    if (!exists && next.length > MAX_BOOKING_SERVICES) {
      return;
    }

    const nextStaff = nextStaffStillValid(next, staffId)
      ? staffId
      : (staff.find((person) => staffOffersAllServices(person.serviceIds, next))?.id ??
        "");

    setSelectedIds(next);
    setStaffId(nextStaff);
    setMessage(null);
    updateQuery(locationId, next, nextStaff);
  }

  function nextStaffStillValid(nextServiceIds: string[], currentStaffId: string) {
    const person = staff.find((row) => row.id === currentStaffId);
    return person ? staffOffersAllServices(person.serviceIds, nextServiceIds) : false;
  }

  function selectStaff(nextStaffId: string) {
    setStaffId(nextStaffId);
    setMessage(null);
    updateQuery(locationId, selectedIds, nextStaffId);
  }

  return (
    <div className="space-y-6">
      <p className={successAlertClass}>
        Your slot is held when you book. Pay at the salon when you arrive.
      </p>

      <div className="space-y-4">
        {locations.length > 1 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-900">Location</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {locations.map((location) => {
                const selected = location.id === locationId;
                return (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => selectLocation(location.id)}
                    className={selected ? cardButtonSelectedClass : cardButtonClass}
                  >
                    <span className="block font-medium">{location.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-900">Services</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((service) => {
              const selected = selectedIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={selected ? cardButtonSelectedClass : cardButtonClass}
                >
                  <span className="block font-medium">{service.name}</span>
                  <span className={selected ? "text-zinc-200" : "text-zinc-600"}>
                    {service.categoryName} · {service.durationMin} min ·{" "}
                    {formatPrice(service.priceCents)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-900">Staff</p>
          {availableStaff.length === 0 ? (
            <p className="text-sm text-zinc-600">
              {selectedIds.length === 0
                ? "Choose at least one service."
                : NO_STAFF_FOR_COMBINATION}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {availableStaff.map((person) => {
                const selected = person.id === staffId;
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => selectStaff(person.id)}
                    className={selected ? cardButtonSelectedClass : cardButtonClass}
                  >
                    <span className="block font-medium">{person.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedServices.length > 0 ? (
        <p className="text-sm text-zinc-700">
          Total at salon:{" "}
          <span className="font-medium text-zinc-900">{formatPrice(totalCents)}</span>
          {" · "}
          {totalMinutes} min
          {overDurationCap ? (
            <span className="block text-red-700">
              Combined duration cannot exceed {MAX_COMBINED_DURATION_MIN} minutes.
            </span>
          ) : null}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900">
          {message}
        </p>
      ) : null}

      <div className="space-y-4">
        {groupedSlots.length === 0 ? (
          <p className="text-sm text-zinc-600">No open slots in the next 7 days.</p>
        ) : (
          groupedSlots.map((group) => (
            <section key={group.day}>
              <h2 className="text-sm font-medium text-zinc-900">{group.day}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.slots.map((iso) => (
                  <form
                    key={iso}
                    action={(formData) => {
                      startTransition(async () => {
                        const result = await action(formData);
                        if (result.error) {
                          setMessage(result.error);
                          if (result.error.includes("Sign in again")) {
                            router.push("/login");
                          }
                          return;
                        }
                      });
                    }}
                  >
                    <input type="hidden" name="locationId" value={locationId} />
                    <input type="hidden" name="serviceIds" value={selectedIds.join(",")} />
                    <input type="hidden" name="staffId" value={staffId} />
                    <input type="hidden" name="startsAt" value={iso} />
                    <button
                      type="submit"
                      data-testid="book-slot"
                      disabled={
                        pending ||
                        !locationId ||
                        selectedIds.length === 0 ||
                        !staffId ||
                        overServiceCap ||
                        overDurationCap
                      }
                      className={
                        iso === initialStartsAt
                          ? `${slotButtonClass} border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800`
                          : slotButtonClass
                      }
                    >
                      {formatTime(new Date(iso))}
                    </button>
                  </form>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
