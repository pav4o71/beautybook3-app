"use client";

import { useState, useTransition } from "react";
import { cancelAppointmentAction } from "./actions";
import { CANCELLATION_REASONS } from "@/lib/cancellation-constants";

export function CancelDialog({ token }: { token: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setError(null);
    setReason("");
    setNote("");
    setIsOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setIsOpen(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    if (reason) formData.append("reason", reason);
    if (note) formData.append("note", note.trim());

    startTransition(async () => {
      const res = await cancelAppointmentAction(token, formData);
      if (res.success) {
        setIsOpen(false);
      } else {
        setError(res.error || "Failed to cancel appointment.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        data-testid="cancel-appointment-button"
        className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-xs hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
      >
        Cancel appointment
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-zinc-200 space-y-4">
            <div>
              <h2
                id="cancel-dialog-title"
                className="text-lg font-bold tracking-tight text-zinc-900"
              >
                Cancel appointment
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Are you sure you want to cancel? Your slot will be released for others.
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="cancel-reason"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1"
                >
                  Reason for cancellation <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <select
                  id="cancel-reason"
                  data-testid="cancel-reason-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                >
                  <option value="">Select a reason</option>
                  {CANCELLATION_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="cancel-note"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-700"
                  >
                    Additional note <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <span className="text-xs text-zinc-400">
                    {300 - note.length} chars left
                  </span>
                </div>
                <textarea
                  id="cancel-note"
                  data-testid="cancel-note-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 300))}
                  maxLength={300}
                  rows={3}
                  disabled={isPending}
                  placeholder="Tell us why you are cancelling..."
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Keep appointment
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  data-testid="confirm-cancel-button"
                  className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
                >
                  {isPending ? "Cancelling..." : "Confirm cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
