import { AppointmentStatus } from "@/app/generated/prisma/enums";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

function statusLabel(status: AppointmentStatus) {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
      return "Confirmed";
    case AppointmentStatus.PENDING:
      return "Pending";
    case AppointmentStatus.COMPLETED:
      return "Completed";
    case AppointmentStatus.NO_SHOW:
      return "No show";
    default:
      return status;
  }
}

function statusBadgeClass(status: AppointmentStatus) {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
      return "bg-emerald-100 text-emerald-800";
    case AppointmentStatus.PENDING:
      return "bg-amber-100 text-amber-800";
    case AppointmentStatus.COMPLETED:
      return "bg-zinc-100 text-zinc-700";
    case AppointmentStatus.NO_SHOW:
      return "bg-red-100 text-red-800";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;

  const now = new Date();
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - 7);

  const appointments = await prisma.appointment.findMany({
    where: {
      customerId: session.user.id,
      status: { not: AppointmentStatus.CANCELLED },
      OR: [{ startsAt: { gte: now } }, { startsAt: { gte: recentCutoff, lt: now } }],
    },
    include: {
      staff: true,
      services: {
        include: { service: true },
        orderBy: { service: { name: "asc" } },
      },
    },
    orderBy: { startsAt: "asc" },
  });

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
                {appointment.status === AppointmentStatus.CONFIRMED ||
                appointment.status === AppointmentStatus.PENDING ? (
                  <p className="mt-3 text-sm font-medium text-emerald-900">
                    Pay at salon: {formatPrice(totalCents)}
                  </p>
                ) : appointment.status === AppointmentStatus.COMPLETED ? (
                  <p className="mt-3 text-sm font-medium text-zinc-700">
                    Paid at salon: {formatPrice(totalCents)}
                  </p>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}
