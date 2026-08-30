"use client";

import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { dangerButtonClass, secondaryButtonClass } from "@/lib/ui";
import { ActionForm } from "../action-form";
import { setAppointmentStatus } from "./actions";

const statusActions = [
  {
    status: AppointmentStatus.COMPLETED,
    label: "Complete",
    className: secondaryButtonClass,
    action: "complete",
  },
  {
    status: AppointmentStatus.NO_SHOW,
    label: "No show",
    className: secondaryButtonClass,
    action: "no-show",
  },
  {
    status: AppointmentStatus.CANCELLED,
    label: "Cancel",
    className: dangerButtonClass,
    action: "cancel",
  },
] as const;

export function AppointmentStatusActions({ appointmentId }: { appointmentId: string }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {statusActions.map((item) => (
        <ActionForm
          key={item.status}
          action={setAppointmentStatus}
          className="inline"
        >
          <input type="hidden" name="id" value={appointmentId} />
          <input type="hidden" name="status" value={item.status} />
          <button
            type="submit"
            className={item.className}
            data-testid={`appointment-${item.action}-${appointmentId}`}
          >
            {item.label}
          </button>
        </ActionForm>
      ))}
    </div>
  );
}
