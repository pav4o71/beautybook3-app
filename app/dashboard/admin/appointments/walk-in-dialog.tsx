"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";
import { createWalkInAppointmentAction } from "./actions";

interface WalkInLocation {
  id: string;
  name: string;
}

interface WalkInStaff {
  id: string;
  name: string;
  locationId: string;
  serviceIds: string[];
}

interface WalkInService {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
}

interface WalkInDialogProps {
  locations: WalkInLocation[];
  activeLocationId: string;
  staff: WalkInStaff[];
  services: WalkInService[];
  currentDateIso: string;
}

export function WalkInDialog({
  locations,
  activeLocationId,
  staff,
  services,
  currentDateIso,
}: WalkInDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [locationId, setLocationId] = useState(activeLocationId);
  const [staffId, setStaffId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(currentDateIso);
  const [time, setTime] = useState("10:00");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableStaff = staff.filter((s) => s.locationId === locationId);

  function handleOpen() {
    setError(null);
    setLocationId(activeLocationId);
    const initialStaff = staff.filter((s) => s.locationId === activeLocationId)[0]?.id ?? "";
    setStaffId(initialStaff);
    setSelectedServiceIds(services[0] ? [services[0].id] : []);
    setDate(currentDateIso);
    setTime("10:00");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setIsOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setIsOpen(false);
    setError(null);
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError("Please enter the customer's name.");
      return;
    }
    if (selectedServiceIds.length === 0) {
      setError("Please select at least one service.");
      return;
    }
    if (!staffId) {
      setError("Please select a specialist.");
      return;
    }
    if (!date || !time) {
      setError("Please select a date and time.");
      return;
    }

    // Construct ISO startsAt from date and time in Asia/Manila (UTC+8)
    const startsAtIso = `${date}T${time}:00+08:00`;

    const formData = new FormData();
    formData.set("locationId", locationId);
    formData.set("staffId", staffId);
    formData.set("serviceIds", selectedServiceIds.join(","));
    formData.set("startsAt", startsAtIso);
    formData.set("customerName", customerName.trim());
    if (customerPhone.trim()) formData.set("customerPhone", customerPhone.trim());
    if (customerEmail.trim()) formData.set("customerEmail", customerEmail.trim());

    startTransition(async () => {
      const res = await createWalkInAppointmentAction({}, formData);
      if (res.error) {
        setError(res.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  }

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.priceCents, 0);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        data-testid="walk-in-button"
        className={primaryButtonClass}
      >
        + Walk-in Appointment
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="walk-in-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div
            className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2
                id="walk-in-dialog-title"
                className="text-lg font-semibold text-zinc-900"
              >
                New Walk-In Appointment
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="text-zinc-400 hover:text-zinc-600 text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {error ? (
              <div
                role="alert"
                data-testid="walk-in-error"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="walk-in-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1"
                >
                  Customer Name *
                </label>
                <input
                  id="walk-in-name"
                  data-testid="walk-in-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  disabled={isPending}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="walk-in-phone"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1"
                  >
                    Phone <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="walk-in-phone"
                    data-testid="walk-in-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 0917 123 4567"
                    disabled={isPending}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="walk-in-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1"
                  >
                    Email <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="walk-in-email"
                    data-testid="walk-in-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    disabled={isPending}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                  />
                </div>
              </div>

              {locations.length > 1 ? (
                <div>
                  <label
                    htmlFor="walk-in-location"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1"
                  >
                    Location
                  </label>
                  <select
                    id="walk-in-location"
                    value={locationId}
                    onChange={(e) => {
                      const newLoc = e.target.value;
                      setLocationId(newLoc);
                      const staffAtNewLoc = staff.filter((s) => s.locationId === newLoc);
                      setStaffId(staffAtNewLoc[0]?.id ?? "");
                    }}
                    disabled={isPending}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="walk-in-staff"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1"
                >
                  Specialist *
                </label>
                <select
                  id="walk-in-staff"
                  data-testid="walk-in-staff"
                  required
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                >
                  <option value="">Select a specialist</option>
                  {availableStaff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                  Services * ({selectedServiceIds.length} selected · {totalDuration} min · {formatPrice(totalPrice)})
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-md border border-zinc-200 p-2 bg-zinc-50">
                  {services.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                      <label
                        key={service.id}
                        data-testid={`walk-in-service-${service.id}`}
                        className={`flex items-center justify-between rounded px-2 py-1 text-sm cursor-pointer transition-colors ${
                          isSelected ? "bg-zinc-900 text-white" : "hover:bg-zinc-200 text-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleService(service.id)}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                          />
                          <span>{service.name}</span>
                        </div>
                        <span className="text-xs opacity-80">
                          {service.durationMin}m · {formatPrice(service.priceCents)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="walk-in-date"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="walk-in-date"
                    data-testid="walk-in-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={isPending}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="walk-in-time"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1"
                  >
                    Start Time
                  </label>
                  <input
                    id="walk-in-time"
                    data-testid="walk-in-time"
                    type="time"
                    step="1800"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    disabled={isPending}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="walk-in-submit"
                  disabled={isPending}
                  className={primaryButtonClass}
                >
                  {isPending ? "Booking..." : "Create Walk-In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
