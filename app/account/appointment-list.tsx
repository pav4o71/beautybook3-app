import type { AppointmentStatus } from "@/app/generated/prisma/enums";
import { surfaceClass } from "@/lib/ui";

type Appointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  organization: { name: string };
  location: { name: string; address: string | null };
  staff: { name: string };
  services: Array<{
    durationMin: number;
    priceCents: number;
    service: { name: string };
  }>;
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

const STATUS_CLASS: Record<AppointmentStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-zinc-100 text-zinc-600",
  CANCELLED: "bg-red-50 text-red-600",
  NO_SHOW: "bg-zinc-100 text-zinc-500",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(cents: number): string {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export function AccountAppointmentList({
  appointments,
}: {
  appointments: Appointment[];
}) {
  const now = new Date();
  const upcoming = appointments.filter(
    (a) => a.startsAt > now && a.status !== "CANCELLED",
  );
  const past = appointments.filter(
    (a) => a.startsAt <= now || a.status === "CANCELLED",
  );

  return (
    <div className="space-y-6">
      {upcoming.length > 0 ? (
        <section>
          <h3 className="mb-3 text-sm font-medium text-zinc-700">Upcoming</h3>
          <ul className="space-y-3">
            {upcoming.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </ul>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section>
          <h3 className="mb-3 text-sm font-medium text-zinc-700">Past</h3>
          <ul className="space-y-3">
            {past.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  const total = appt.services.reduce((sum, s) => sum + s.priceCents, 0);

  return (
    <li className={`${surfaceClass} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-zinc-900">{appt.organization.name}</p>
          <p className="text-sm text-zinc-500">
            {appt.location.name}
            {appt.location.address ? ` · ${appt.location.address}` : ""}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[appt.status]}`}
        >
          {STATUS_LABEL[appt.status]}
        </span>
      </div>

      <div className="mt-2 space-y-1">
        <p className="text-sm text-zinc-700">
          <span className="font-medium">When:</span> {formatDate(appt.startsAt)}
        </p>
        <p className="text-sm text-zinc-700">
          <span className="font-medium">With:</span> {appt.staff.name}
        </p>
        <p className="text-sm text-zinc-700">
          <span className="font-medium">Services:</span>{" "}
          {appt.services.map((s) => s.service.name).join(", ")}
        </p>
        <p className="text-sm text-zinc-700">
          <span className="font-medium">Total:</span> {formatPrice(total)}
        </p>
      </div>
    </li>
  );
}
