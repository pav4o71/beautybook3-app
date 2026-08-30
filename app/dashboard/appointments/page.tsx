import { appointmentPayCopy, statusBadgeClass, statusLabel } from "@/lib/appointment-status";
import { getCustomerAppointments } from "@/lib/appointments";
import { formatDay, formatTime } from "@/lib/format";
import { requireUser } from "@/lib/require-user";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;

  const appointments = await getCustomerAppointments(session.user.id);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Appointments
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Upcoming and recent bookings. Pay at the salon when you arrive.
      </p>

      {params.booked === "1" ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Booked! Pay at the salon when you arrive.
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {appointments.length === 0 ? (
          <p className="text-sm text-zinc-600">No upcoming or recent appointments.</p>
        ) : (
          appointments.map((appointment) => {
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
                className="rounded-lg border border-zinc-200 bg-white p-4"
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
          })
        )}
      </div>
    </main>
  );
}
