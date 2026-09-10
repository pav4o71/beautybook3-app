import {
  isAppointmentActionable,
  statusBadgeClass,
  statusLabel,
} from "@/lib/appointment-status";
import {
  getAppointmentsForDay,
  getAppointmentContactDisplay,
} from "@/lib/appointments";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import { secondaryButtonClass } from "@/lib/ui";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AdminNav } from "../admin-nav";
import { formatPhoneDisplay } from "@/lib/phone";
import { AppointmentStatusActions } from "./appointment-status-actions";
import { WalkInDialog } from "./walk-in-dialog";
import {
  addSalonDays,
  parseSalonIsoDate,
  salonIsoDate,
} from "@/lib/timezone";

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { organizationId, locationId } = await requireActiveOrgAdmin();
  const query = await searchParams;
  const rawDate = Array.isArray(query.date) ? query.date[0] : query.date;
  const requestedDate = rawDate ? parseSalonIsoDate(rawDate) : null;
  const selectedDate = requestedDate ?? new Date();
  const selectedDateIso = salonIsoDate(selectedDate);
  const todayIso = salonIsoDate(new Date());
  const isToday = selectedDateIso === todayIso;

  const prevDateIso = salonIsoDate(addSalonDays(selectedDate, -1));
  const nextDateIso = salonIsoDate(addSalonDays(selectedDate, 1));

  const [appointments, staff, services, locations] = await Promise.all([
    getAppointmentsForDay(organizationId, selectedDate, locationId),
    prisma.staff.findMany({
      where: { organizationId, locationId, active: true },
      include: { services: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeLocation = locations.find((l) => l.id === locationId);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <AdminNav current="appointments" />

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {isToday ? "Today's appointments" : `Appointments for ${formatDay(selectedDate)}`}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {activeLocation?.name ? `${activeLocation.name} · ` : ""}
            {formatDay(selectedDate)} · Staff day board · Mark completed, no-show, or cancelled.
          </p>
        </div>
        <Link href="/dashboard/admin" className={secondaryButtonClass}>
          Back to admin
        </Link>
      </div>

      {/* Day Navigation & Action Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/admin/appointments?date=${prevDateIso}`}
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-xs hover:bg-zinc-100 transition-colors"
            data-testid="prev-day-button"
            title="Previous day"
          >
            ← Prev
          </Link>
          {!isToday ? (
            <Link
              href="/dashboard/admin/appointments"
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-xs hover:bg-zinc-100 transition-colors"
              data-testid="today-button"
            >
              Today
            </Link>
          ) : null}
          <Link
            href={`/dashboard/admin/appointments?date=${nextDateIso}`}
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-xs hover:bg-zinc-100 transition-colors"
            data-testid="next-day-button"
            title="Next day"
          >
            Next →
          </Link>
          <span
            className="ml-2 text-sm font-medium text-zinc-900 hidden sm:inline"
            data-testid="selected-day-label"
          >
            {formatDay(selectedDate)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <WalkInDialog
            locations={locations.map((l) => ({ id: l.id, name: l.name }))}
            activeLocationId={locationId}
            staff={staff.map((s) => ({
              id: s.id,
              name: s.name,
              locationId: s.locationId,
              serviceIds: s.services.map((link) => link.serviceId),
            }))}
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              durationMin: s.durationMin,
              priceCents: s.priceCents,
            }))}
            currentDateIso={selectedDateIso}
          />
        </div>
      </div>

      {/* Staff Day Board: Column Lanes */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
            Staff Day Board ({staff.length} {staff.length === 1 ? "specialist" : "specialists"})
          </h2>
          {activeLocation?.name ? (
            <span className="text-xs font-medium text-zinc-500">
              Location: <strong className="text-zinc-700">{activeLocation.name}</strong>
            </span>
          ) : null}
        </div>

        {staff.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
            No active staff members found for this location.
          </p>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            data-testid="staff-day-board"
          >
            {staff.map((specialist) => {
              const specialistAppointments = appointments.filter(
                (a) => a.staffId === specialist.id,
              );

              return (
                <div
                  key={specialist.id}
                  data-testid={`staff-lane-${specialist.id}`}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs flex flex-col min-h-[320px]"
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 font-semibold text-xs text-white">
                        {specialist.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-900 text-sm">{specialist.name}</h3>
                        <p className="text-xs text-zinc-500">
                          {specialistAppointments.length}{" "}
                          {specialistAppointments.length === 1 ? "appointment" : "appointments"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    {specialistAppointments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 py-12 text-center">
                        <p className="text-xs text-zinc-500 font-medium">No appointments scheduled</p>
                        <p className="text-2xs text-zinc-400 mt-1">Free for walk-ins or bookings</p>
                      </div>
                    ) : (
                      specialistAppointments.map((appointment) => {
                        const totalCents = appointment.services.reduce(
                          (sum, row) => sum + row.priceCents,
                          0,
                        );
                        const totalDuration = appointment.services.reduce(
                          (sum, row) => sum + row.service.durationMin,
                          0,
                        );
                        const serviceNames = appointment.services
                          .map((row) => row.service.name)
                          .join(", ");
                        const contact = getAppointmentContactDisplay(appointment);

                        return (
                          <article
                            key={appointment.id}
                            className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3 text-sm transition-shadow hover:shadow-xs hover:border-zinc-300"
                            data-testid={`admin-appointment-${appointment.id}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-zinc-900 text-xs">
                                    {formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)}
                                  </span>
                                  <span className="text-2xs font-medium text-zinc-500 bg-zinc-200/80 rounded px-1.5 py-0.2">
                                    {totalDuration}m
                                  </span>
                                </div>
                                <p className="font-medium text-zinc-800 mt-0.5 text-xs">
                                  {serviceNames}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-2xs font-semibold shrink-0 ${statusBadgeClass(
                                  appointment.status,
                                )}`}
                              >
                                {statusLabel(appointment.status)}
                              </span>
                            </div>

                            <div className="mt-2 text-xs text-zinc-600 space-y-0.5 border-t border-zinc-200/60 pt-2">
                              <p className="font-medium text-zinc-900">
                                {contact.customerName}
                                <span className="font-normal text-zinc-500"> · with {specialist.name}</span>
                                {contact.customerEmail ? (
                                  <span className="font-normal text-zinc-600 text-xs ml-1">
                                    ({contact.customerEmail})
                                  </span>
                                ) : null}
                              </p>
                              {contact.customerPhone ? (
                                <p>
                                  <a
                                    href={`tel:${contact.customerPhone}`}
                                    className="text-zinc-700 underline hover:text-zinc-900 font-medium"
                                    data-testid={`admin-appointment-phone-${appointment.id}`}
                                  >
                                    {formatPhoneDisplay(contact.customerPhone)}
                                  </a>
                                </p>
                              ) : null}
                              <p className="font-semibold text-zinc-900 pt-0.5">
                                {formatPrice(totalCents)}
                              </p>
                            </div>

                            {isAppointmentActionable(appointment.status) ? (
                              <div className="mt-2.5 pt-2 border-t border-zinc-200/60">
                                <AppointmentStatusActions
                                  appointmentId={appointment.id}
                                  selectedDateIso={selectedDateIso}
                                />
                              </div>
                            ) : null}
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
