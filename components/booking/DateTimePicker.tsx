"use client";

import { controlClass, labelClass, labelTextClass, primaryButtonClass, slotButtonClass } from "@/lib/ui";
import { salonIsoDate } from "@/lib/timezone";

const TIME_SLOTS = [
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

export function DateTimePicker({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  onContinue,
}: {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onContinue: () => void;
}) {
  const minDate = salonIsoDate();

  return (
    <div className="space-y-6">
      <label className={labelClass}>
        <span className={labelTextClass}>Date</span>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
          min={minDate}
          className={controlClass}
          data-testid="date-picker"
        />
      </label>

      <div className="space-y-2">
        <p className={labelTextClass}>Time</p>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
          {TIME_SLOTS.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => onTimeChange(time)}
              className={
                selectedTime === time
                  ? `${slotButtonClass} border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800`
                  : slotButtonClass
              }
              data-testid={`time-${time}`}
            >
              {time}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={!selectedDate || !selectedTime}
        className={`w-full ${primaryButtonClass}`}
        data-testid="continue-datetime"
      >
        Continue
      </button>
    </div>
  );
}
