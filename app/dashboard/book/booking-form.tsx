"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ActionFormState } from "@/lib/action-form-state";
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
  initialServiceId,
  initialStaffId,
  initialLocationId = "",
  slots,
  action = bookSlot,
  bookPath = "/dashboard/book",
}: {
  services: ServiceOption[];
  staff: StaffOption[];
  locations?: LocationOption[];
  initialServiceId: string;
  initialStaffId: string;
  initialLocationId?: string;
  slots: string[];
  action?: (formData: FormData) => Promise<ActionFormState>;
  bookPath?: string;
}) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(initialLocationId);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [staffId, setStaffId] = useState(initialStaffId);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const availableStaff = useMemo(
    () => staff.filter((person) => person.serviceIds.includes(serviceId)),
    [serviceId, staff],
  );

  const selectedService = services.find((service) => service.id === serviceId);

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
    nextServiceId: string,
    nextStaffId: string,
  ) {
    const params = new URLSearchParams();
    if (nextLocationId) params.set("locationId", nextLocationId);
    if (nextServiceId) params.set("serviceId", nextServiceId);
    if (nextStaffId) params.set("staffId", nextStaffId);
    router.push(`${bookPath}?${params.toString()}`);
  }

  function selectLocation(nextLocationId: string) {
    setLocationId(nextLocationId);
    setServiceId("");
    setStaffId("");
    setMessage(null);
    updateQuery(nextLocationId, "", "");
  }

  function selectService(nextServiceId: string) {
    const nextStaff =
      availableStaff.find((person) => person.id === staffId) &&
      staff.find(
        (person) =>
          person.id === staffId && person.serviceIds.includes(nextServiceId),
      )
        ? staffId
        : (staff.find((person) => person.serviceIds.includes(nextServiceId))?.id ??
          "");
    setServiceId(nextServiceId);
    setStaffId(nextStaff);
    setMessage(null);
    updateQuery(locationId, nextServiceId, nextStaff);
  }

  function selectStaff(nextStaffId: string) {
    setStaffId(nextStaffId);
    setMessage(null);
    updateQuery(locationId, serviceId, nextStaffId);
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
          <p className="text-sm font-medium text-zinc-900">Service</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((service) => {
              const selected = service.id === serviceId;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => selectService(service.id)}
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
              No staff available for this service.
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

      {selectedService ? (
        <p className="text-sm text-zinc-700">
          Total at salon:{" "}
          <span className="font-medium text-zinc-900">
            {formatPrice(selectedService.priceCents)}
          </span>
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
                    <input type="hidden" name="serviceId" value={serviceId} />
                    <input type="hidden" name="staffId" value={staffId} />
                    <input type="hidden" name="startsAt" value={iso} />
                    <button
                      type="submit"
                      data-testid="book-slot"
                      disabled={pending || !locationId || !serviceId || !staffId}
                      className={slotButtonClass}
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
