"use client";

import type { ReactNode } from "react";
import { secondaryButtonClass } from "@/lib/ui";

const progressWidthClass = ["w-1/4", "w-2/4", "w-3/4", "w-full"] as const;

export function BookingStep({
  step,
  currentStep,
  title,
  children,
  onBack,
}: {
  step: number;
  currentStep: number;
  title: string;
  children: ReactNode;
  onBack?: () => void;
}) {
  if (step !== currentStep) return null;

  const progressClass = progressWidthClass[Math.min(Math.max(step, 1), 4) - 1];

  return (
    <div>
      {onBack ? (
        <button type="button" onClick={onBack} className={`${secondaryButtonClass} mb-4`}>
          Back
        </button>
      ) : null}

      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white">
            {step}
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h2>
        </div>
        <div className="mt-4 h-2 w-full rounded-full bg-zinc-200">
          <div className={`h-2 rounded-full bg-zinc-900 ${progressClass}`} />
        </div>
      </div>

      {children}
    </div>
  );
}
