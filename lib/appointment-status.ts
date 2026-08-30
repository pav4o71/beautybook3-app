import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { formatPrice } from "@/lib/format";

export function statusLabel(status: AppointmentStatus) {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
      return "Confirmed";
    case AppointmentStatus.PENDING:
      return "Pending";
    case AppointmentStatus.COMPLETED:
      return "Completed";
    case AppointmentStatus.NO_SHOW:
      return "No show";
    case AppointmentStatus.CANCELLED:
      return "Cancelled";
    default:
      return status;
  }
}

export function statusBadgeClass(status: AppointmentStatus) {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
      return "bg-emerald-100 text-emerald-800";
    case AppointmentStatus.PENDING:
      return "bg-amber-100 text-amber-800";
    case AppointmentStatus.COMPLETED:
      return "bg-zinc-100 text-zinc-700";
    case AppointmentStatus.NO_SHOW:
      return "bg-red-100 text-red-800";
    case AppointmentStatus.CANCELLED:
      return "bg-zinc-100 text-zinc-500";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export function isAppointmentActionable(status: AppointmentStatus) {
  return (
    status === AppointmentStatus.CONFIRMED || status === AppointmentStatus.PENDING
  );
}

export function appointmentPayCopy(status: AppointmentStatus, totalCents: number) {
  const price = formatPrice(totalCents);

  switch (status) {
    case AppointmentStatus.CONFIRMED:
    case AppointmentStatus.PENDING:
      return { text: `Pay at salon: ${price}`, className: "mt-3 text-sm font-medium text-emerald-900" };
    case AppointmentStatus.COMPLETED:
      return { text: `Paid at salon: ${price}`, className: "mt-3 text-sm font-medium text-zinc-700" };
    case AppointmentStatus.NO_SHOW:
      return {
        text: "Marked no-show — contact the salon to rebook.",
        className: "mt-3 text-sm font-medium text-red-800",
      };
    default:
      return null;
  }
}
