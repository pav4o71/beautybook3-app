"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ActionFormState } from "@/lib/action-form-state";
import {
  MAX_BOOKING_SERVICES,
  MAX_COMBINED_DURATION_MIN,
  NO_STAFF_FOR_COMBINATION,
  locationHasCapableStaff,
  staffOffersAllServices,
} from "@/lib/booking-limits";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import {
  cardButtonClass,
  cardButtonSelectedClass,
  controlClass,
  labelClass,
  labelTextClass,
  slotButtonClass,
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
  locationId: string;
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
  requireContactInfo = false,
  defaultCustomerName = "",
  defaultCustomerPhone = "",
  defaultCustomerEmail = "",
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
  requireContactInfo?: boolean;
  defaultCustomerName?: string;
  defaultCustomerPhone?: string;
  defaultCustomerEmail?: string;
}) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(initialLocationId);
  const [selectedIds, setSelectedIds] = useState(initialServiceIds);
  const [staffId, setStaffId] = useState(initialStaffId);
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [customerPhone, setCustomerPhone] = useState(defaultCustomerPhone);
  const [customerEmail, setCustomerEmail] = useState(defaultCustomerEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const availableStaff = useMemo(
    () =>
      staff.filter(
        (person) =>
          person.locationId === locationId &&
          staffOffersAllServices(person.serviceIds, selectedIds),
      ),
    [locationId, selectedIds, staff],
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

    const staffPool = staff.filter((person) => person.locationId === locationId);
    const nextStaff =
      staffPool.find((person) => person.id === staffId && staffOffersAllServices(person.serviceIds, next))
        ?.id ??
      staffPool.find((person) => staffOffersAllServices(person.serviceIds, next))?.id ??
      "";

    setSelectedIds(next);
    setStaffId(nextStaff);
    setMessage(null);
    updateQuery(locationId, next, nextStaff);
  }

  function locationCanServe(nextLocationId: string, nextServiceIds: string[]) {
    if (nextServiceIds.length === 0) {
      return true;
    }
    return locationHasCapableStaff(nextLocationId, staff, nextServiceIds);
  }

  function selectStaff(nextStaffId: string) {
    setStaffId(nextStaffId);
    setMessage(null);
    updateQuery(locationId, selectedIds, nextStaffId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700 shadow-xs">
        <svg
          className="size-4 shrink-0 text-emerald-600"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm0 6a.75.75 0 10-1.5 0 .75.75 0 001.5 0z"
            clipRule="evenodd"
          />
        </svg>
        <span>Your slot is held when you book. Pay at the salon when you arrive.</span>
      </div>

      <div className="space-y-6">
        {locations.length > 1 ? (
          <div className="space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Location
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {locations.map((location) => {
                const selected = location.id === locationId;
                const capable = locationCanServe(location.id, selectedIds);
                return (
                  <button
                    key={location.id}
                    type="button"
                    disabled={!capable && location.id !== locationId}
                    title={
                      capable ? undefined : NO_STAFF_FOR_COMBINATION
                    }
                    onClick={() => selectLocation(location.id)}
                    className={
                      selected
                        ? `${cardButtonSelectedClass} shadow-xs`
                        : `${cardButtonClass} shadow-xs disabled:cursor-not-allowed disabled:opacity-50`
                    }
                  >
                    <span className="block font-medium">{location.name}</span>
                    {capable ? null : (
                      <span className="mt-1 block text-xs text-zinc-400">
                        No staff for this combination
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Services
            </h2>
            <span className="text-xs text-zinc-500">
              Up to {MAX_BOOKING_SERVICES} services
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((service) => {
              const selected = selectedIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={
                    selected
                      ? `${cardButtonSelectedClass} shadow-xs`
                      : `${cardButtonClass} shadow-xs`
                  }
                >
                  <span className="block font-medium">{service.name}</span>
                  <span
                    className={
                      selected
                        ? "mt-0.5 block text-xs text-zinc-200"
                        : "mt-0.5 block text-xs text-zinc-500"
                    }
                  >
                    {service.categoryName} · {service.durationMin} min ·{" "}
                    {formatPrice(service.priceCents)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Specialist
          </h2>
          {availableStaff.length === 0 ? (
            <p className="text-sm text-zinc-600">
              {selectedIds.length === 0
                ? "Choose at least one service."
                : NO_STAFF_FOR_COMBINATION}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {availableStaff.map((person) => {
                const selected = person.id === staffId;
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => selectStaff(person.id)}
                    className={
                      selected
                        ? `${cardButtonSelectedClass} shadow-xs`
                        : `${cardButtonClass} shadow-xs`
                    }
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-sm shadow-xs">
          <div className="text-zinc-700">
            Total at salon:{" "}
            <span className="text-base font-bold text-zinc-900">
              {formatPrice(totalCents)}
            </span>
            <span className="text-zinc-500">
              {" "}· {totalMinutes} min ({selectedServices.length}{" "}
              {selectedServices.length === 1 ? "service" : "services"})
            </span>
          </div>
          {overDurationCap ? (
            <span className="w-full text-xs font-medium text-red-700">
              Combined duration cannot exceed {MAX_COMBINED_DURATION_MIN} minutes.
            </span>
          ) : null}
        </div>
      ) : null}

      {requireContactInfo ? (
        <section
          className="space-y-4 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-xs"
          data-testid="contact-details-section"
        >
          <div className="border-b border-zinc-100 pb-3">
            <h2 className="text-base font-semibold text-zinc-900">
              Your contact details
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              The salon will use this to confirm and identify your appointment.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelTextClass}>
                Full Name <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                name="customerNameInput"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Maria Santos"
                maxLength={100}
                className={controlClass}
                data-testid="customer-name-input"
              />
            </label>

            <label className={labelClass}>
              <span className={labelTextClass}>
                Mobile Number <span className="text-red-500">*</span>
              </span>
              <input
                type="tel"
                name="customerPhoneInput"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 0917 123 4567"
                maxLength={40}
                className={controlClass}
                data-testid="customer-phone-input"
              />
            </label>
          </div>

          <div>
            <label className={labelClass}>
              <span className={labelTextClass}>
                Email Address{" "}
                <span className="text-xs font-normal text-zinc-500">(optional)</span>
              </span>
              <input
                type="email"
                name="customerEmailInput"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="name@example.com (optional)"
                maxLength={254}
                className={controlClass}
                data-testid="customer-email-input"
              />
            </label>
          </div>
        </section>
      ) : null}

      {message ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-xs">
          <svg
            className="size-4 shrink-0 text-amber-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>{message}</span>
        </div>
      ) : null}

      <div className="space-y-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Available Times
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Select a slot to confirm your booking instantly.
          </p>
        </div>
        {groupedSlots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500">
            No open slots in the next 7 days.
          </p>
        ) : (
          groupedSlots.map((group) => (
            <section key={group.day} className="space-y-2.5">
              <h3 className="text-sm font-semibold text-zinc-900">{group.day}</h3>
              <div className="flex flex-wrap gap-2">
                {group.slots.map((iso) => {
                  const selectedSlot =
                    Boolean(initialStartsAt) &&
                    new Date(iso).getTime() === new Date(initialStartsAt).getTime();
                  return (
                    <form
                      key={iso}
                      action={(formData) => {
                        if (requireContactInfo) {
                          if (!customerName.trim() || !customerPhone.trim()) {
                            setMessage(
                              "Please enter your name and mobile number before choosing a time.",
                            );
                            return;
                          }
                        }
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
                      <input
                        type="hidden"
                        name="serviceIds"
                        value={selectedIds.join(",")}
                      />
                      <input type="hidden" name="staffId" value={staffId} />
                      <input type="hidden" name="startsAt" value={iso} />
                      <input type="hidden" name="customerName" value={customerName} />
                      <input type="hidden" name="customerPhone" value={customerPhone} />
                      <input type="hidden" name="customerEmail" value={customerEmail} />
                      <button
                        type="submit"
                        data-testid="book-slot"
                        data-slot-selected={selectedSlot ? "true" : undefined}
                        disabled={
                          pending ||
                          !locationId ||
                          selectedIds.length === 0 ||
                          !staffId ||
                          overServiceCap ||
                          overDurationCap
                        }
                        className={
                          selectedSlot
                            ? `${slotButtonClass} border-zinc-900 bg-zinc-900 font-medium text-white hover:bg-zinc-800 shadow-xs`
                            : `${slotButtonClass} shadow-xs transition hover:border-zinc-400`
                        }
                      >
                        {formatTime(new Date(iso))}
                      </button>
                    </form>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
