import { appointmentPayCopy, statusBadgeClass, statusLabel } from "@/lib/appointment-status";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { getCustomerAppointments } from "@/lib/appointments";
import { formatDay, formatTime } from "@/lib/format";
import { requireActiveOrgContext } from "@/lib/require-org";
import { pageMainClass, primaryButtonClass, successAlertClass } from "@/lib/ui";
import Link from "next/link";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const { session, organizationId } = await requireActiveOrgContext();
  const params = await searchParams;

  const appointments = await getCustomerAppointments(organizationId, session.user.id);

  return (
    <main className={pageMainClass}>
      <PageHeader
        title="Appointments"
        lead="Upcoming and recent bookings. Pay at the salon when you arrive."
      />

      {params.booked === "1" ? (
        <p className={successAlertClass}>Booked! Pay at the salon when you arrive.</p>
      ) : null}

      {appointments.length === 0 ? (
        <EmptyState
          title="No upcoming or recent appointments"
          description="Book a service to see it here."
        >
          <Link href="/dashboard/book" className={primaryButtonClass}>
            Book
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const totalCents = appointment.services.reduce(
              (sum, row) => sum + row.priceCents,
              0,
            );
            const serviceNames = appointment.services
              .map((row) => row.service.name)
              .join(", ");
            const payCopy = appointmentPayCopy(appointment.status, totalCents);

            return (
              <article
                key={appointment.id}
                className="rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-zinc-900">{serviceNames}</p>
                    <p className="text-sm text-zinc-600">with {appointment.staff.name}</p>
                    <p className="text-sm text-zinc-700">
                      {formatDay(appointment.startsAt)} ·{" "}
                      {formatTime(appointment.startsAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(appointment.status)}`}
                  >
                    {statusLabel(appointment.status)}
                  </span>
                </div>
                {payCopy ? (
                  <p className={payCopy.className}>{payCopy.text}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
