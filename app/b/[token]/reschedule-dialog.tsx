"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDay, formatTime } from "@/lib/format";
import { slotButtonClass } from "@/lib/ui";
import { rescheduleAppointmentAction } from "./actions";

type SlotGroup = {
  day: string;
  slots: string[];
};

export function RescheduleDialog({
  token,
  specialistName,
  slots,
  currentStartsAt,
}: {
  token: string;
  specialistName: string;
  slots: string[];
  currentStartsAt?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const slotGroups = useMemo(() => {
    const groups: SlotGroup[] = [];
    for (const iso of slots) {
      const date = new Date(iso);
      const day = formatDay(date);
      let group = groups.find((g) => g.day === day);
      if (!group) {
        group = { day, slots: [] };
        groups.push(group);
      }
      group.slots.push(iso);
    }
    return groups;
  }, [slots]);

  function handleOpen() {
    setError(null);
    setSelectedSlot(null);
    setIsOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setIsOpen(false);
    setError(null);
    setSelectedSlot(null);
  }

  function handleConfirm() {
    if (!selectedSlot) {
      setError("Please select a time slot.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await rescheduleAppointmentAction(token, selectedSlot);
      if (res.success) {
        setIsOpen(false);
        router.replace(`/b/${token}?rescheduled=1`);
      } else {
        setError(res.error || "Failed to reschedule appointment.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        data-testid="reschedule-appointment-button"
        className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 transition-colors"
      >
        Reschedule appointment
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white p-6 shadow-xl border border-zinc-200">
            <div className="mb-4">
              <h2
                id="reschedule-dialog-title"
                className="text-lg font-bold tracking-tight text-zinc-900"
              >
                Reschedule appointment
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Choose a new date and time with{" "}
                <span className="font-semibold text-zinc-900">{specialistName}</span>.
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1">
              {slotGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
                  No alternative slots available in the next 14 days. Please contact the salon directly.
                </div>
              ) : (
                slotGroups.map((group) => (
                  <section key={group.day} className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {group.day}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {group.slots.map((iso) => {
                        const isSelected = selectedSlot === iso;
                        const isCurrent =
                          currentStartsAt &&
                          new Date(currentStartsAt).getTime() === new Date(iso).getTime();
                        if (isCurrent) return null;

                        return (
                          <button
                            key={iso}
                            type="button"
                            data-testid="reschedule-slot"
                            data-slot-selected={isSelected ? "true" : undefined}
                            onClick={() => setSelectedSlot(iso)}
                            disabled={isPending}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                              isSelected
                                ? "bg-zinc-900 text-white shadow-xs"
                                : slotButtonClass
                            }`}
                          >
                            {formatTime(new Date(iso))}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>

            {selectedSlot ? (
              <div className="mt-4 rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-700 flex items-center justify-between">
                <span>
                  New time:{" "}
                  <strong className="text-zinc-900 font-semibold">
                    {formatDay(new Date(selectedSlot))} at {formatTime(new Date(selectedSlot))}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-800 underline"
                >
                  Clear
                </button>
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Keep current time
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending || !selectedSlot}
                data-testid="confirm-reschedule-button"
                className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50"
              >
                {isPending ? "Rescheduling..." : "Confirm reschedule"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
