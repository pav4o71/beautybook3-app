import {
  isAppointmentActionable,
  statusBadgeClass,
  statusLabel,
} from "@/lib/appointment-status";
import { getAppointmentsForDay } from "@/lib/appointments";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import { secondaryButtonClass } from "@/lib/ui";
import Link from "next/link";
import { AdminNav } from "../admin-nav";
import { AppointmentStatusActions } from "./appointment-status-actions";

export default async function AdminAppointmentsPage() {
  const { organizationId } = await requireActiveOrgAdmin();
  const today = new Date();
  const appointments = await getAppointmentsForDay(organizationId, today);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <AdminNav current="appointments" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Today&apos;s appointments
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {formatDay(today)} · Mark completed, no-show, or cancelled.
          </p>
        </div>
        <Link href="/dashboard/admin" className={secondaryButtonClass}>
          Back to admin
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {appointments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
            No appointments scheduled for today.
          </p>
        ) : (
          appointments.map((appointment) => {
            const totalCents = appointment.services.reduce(
              (sum, row) => sum + row.priceCents,
              0,
            );
            const serviceNames = appointment.services
              .map((row) => row.service.name)
              .join(", ");
            const customerLabel =
              appointment.customer?.name ??
              appointment.customer?.email ??
              "Walk-in";

            return (
              <article
                key={appointment.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
                data-testid={`admin-appointment-${appointment.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-zinc-900">{serviceNames}</p>
                    <p className="text-sm text-zinc-600">
                      {customerLabel} · with {appointment.staff.name}
                    </p>
                    <p className="text-sm text-zinc-700">
                      {formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)}
                    </p>
                    <p className="text-sm font-medium text-zinc-900">
                      {formatPrice(totalCents)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(appointment.status)}`}
                  >
                    {statusLabel(appointment.status)}
                  </span>
                </div>

                {isAppointmentActionable(appointment.status) ? (
                  <AppointmentStatusActions appointmentId={appointment.id} />
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}
