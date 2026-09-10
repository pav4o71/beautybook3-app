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
import {
  appointmentHeight,
  appointmentTop,
  buildTimeMarkers,
  deriveVisibleRange,
  getAppointmentSnapshotDuration,
  PIXELS_PER_MINUTE,
  STEP_MINUTES,
} from "@/lib/admin-day-board-geometry";

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

  const [appointments, staff, services, locations, schedules] = await Promise.all([
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
    prisma.staffSchedule.findMany({
      where: { organizationId, locationId },
    }),
  ]);

  const activeLocation = locations.find((l) => l.id === locationId);

  const visibleRange = deriveVisibleRange(
    selectedDate,
    schedules,
    appointments.map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt, status: a.status })),
  );

  const timeMarkers = buildTimeMarkers(
    visibleRange.startMinutes,
    visibleRange.endMinutes,
    STEP_MINUTES,
    PIXELS_PER_MINUTE,
  );

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
      <AdminNav current="appointments" />

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {isToday ? "Today's appointments" : `Appointments for ${formatDay(selectedDate)}`}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {activeLocation?.name ? `${activeLocation.name} · ` : ""}
            {formatDay(selectedDate)} · Staff day timeline · Mark completed, no-show, or cancelled.
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

      {/* Staff Day Timeline Board */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
            Staff Day Timeline ({staff.length} {staff.length === 1 ? "specialist" : "specialists"})
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
            className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden"
            data-testid="staff-day-board"
          >
            <div className="overflow-x-auto">
              <div className="flex min-w-max">
                {/* 1. Left Time Gutter */}
                <div
                  className="w-16 shrink-0 border-r border-zinc-200 bg-zinc-50/90 select-none z-20 sticky left-0"
                  data-testid="timeline-time-gutter"
                >
                  <div className="h-16 border-b border-zinc-200 flex items-center justify-center">
                    <span className="text-2xs font-bold uppercase tracking-wider text-zinc-400">Time</span>
                  </div>
                  <div className="relative" style={{ height: `${visibleRange.totalHeightPx}px` }}>
                    {timeMarkers.map((marker) => (
                      <div
                        key={marker.minutes}
                        data-testid={`time-marker-${marker.label}`}
                        className="absolute left-0 right-1 text-right -translate-y-1/2 pr-2"
                        style={{ top: `${marker.topPx}px` }}
                      >
                        <span
                          className={`tabular-nums ${
                            marker.isHour
                              ? "text-xs font-semibold text-zinc-800"
                              : "text-2xs font-medium text-zinc-600"
                          }`}
                        >
                          {marker.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Staff Lanes */}
                <div className="flex flex-1 divide-x divide-zinc-200">
                  {staff.map((specialist) => {
                    const allSpecialistAppts = appointments.filter(
                      (a) => a.staffId === specialist.id,
                    );
                    const activeAppointments = allSpecialistAppts.filter(
                      (a) => a.status !== "CANCELLED",
                    );
                    const cancelledAppointments = allSpecialistAppts.filter(
                      (a) => a.status === "CANCELLED",
                    );

                    return (
                      <div
                        key={specialist.id}
                        data-testid={`staff-lane-${specialist.id}`}
                        className="w-72 min-w-[280px] max-w-[380px] shrink-0 flex flex-col bg-white"
                      >
                        {/* Lane Header */}
                        <div className="h-16 px-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 font-semibold text-xs text-white">
                              {specialist.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-zinc-900 text-sm leading-tight">
                                {specialist.name}
                              </h3>
                              <p className="text-2xs text-zinc-500">
                                {activeAppointments.length}{" "}
                                {activeAppointments.length === 1 ? "appointment" : "appointments"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Timeline Grid Body */}
                        <div
                          className="relative bg-zinc-50/20"
                          style={{ height: `${visibleRange.totalHeightPx}px` }}
                        >
                          {/* Horizontal 30-min grid lines */}
                          {timeMarkers.map((marker) => (
                            <div
                              key={marker.minutes}
                              className={`absolute inset-x-0 pointer-events-none ${
                                marker.isHour
                                  ? "border-b border-zinc-200/90"
                                  : "border-b border-zinc-100"
                              }`}
                              style={{ top: `${marker.topPx}px` }}
                            />
                          ))}

                          {/* Active Appointment Cards */}
                          {activeAppointments.map((appointment) => {
                            const topPx = appointmentTop(
                              appointment.startsAt,
                              visibleRange.startMinutes,
                              PIXELS_PER_MINUTE,
                            );
                            const heightPx = appointmentHeight(
                              appointment.startsAt,
                              appointment.endsAt,
                              PIXELS_PER_MINUTE,
                            );
                            const snapshotDuration = getAppointmentSnapshotDuration(
                              appointment.services,
                            );
                            const totalCents = appointment.services.reduce(
                              (sum, row) => sum + row.priceCents,
                              0,
                            );
                            const serviceNames = appointment.services
                              .map((row) => row.service.name)
                              .join(", ");
                            const contact = getAppointmentContactDisplay(appointment);
                            const actionable = isAppointmentActionable(appointment.status);

                            return (
                              <article
                                key={appointment.id}
                                className="absolute inset-x-1.5 rounded-lg border border-zinc-300 bg-white p-2.5 shadow-xs hover:shadow-md hover:border-zinc-400 transition-all z-10 flex flex-col justify-between overflow-y-auto"
                                data-testid={`admin-appointment-${appointment.id}`}
                                style={{
                                  top: `${topPx}px`,
                                  height: `${Math.max(56, heightPx - 3)}px`,
                                }}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div>
                                      <div className="flex items-center gap-1">
                                        <span className="font-bold text-zinc-900 text-xs tabular-nums">
                                          {formatTime(appointment.startsAt)} –{" "}
                                          {formatTime(appointment.endsAt)}
                                        </span>
                                        <span className="text-2xs font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200 rounded px-1 py-0.2">
                                          {snapshotDuration}m
                                        </span>
                                      </div>
                                      <p className="font-medium text-zinc-800 text-xs mt-0.5 leading-snug">
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

                                  <div className="mt-1.5 text-xs text-zinc-600 space-y-0.5 border-t border-zinc-100 pt-1">
                                    <p className="font-medium text-zinc-900 leading-snug">
                                      {contact.customerName}
                                      <span className="font-normal text-zinc-500">
                                        {" "}
                                        · {specialist.name}
                                      </span>
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
                                    <p className="font-semibold text-zinc-900">
                                      {formatPrice(totalCents)}
                                    </p>
                                  </div>
                                </div>

                                {actionable ? (
                                  <div className="mt-2 pt-1 border-t border-zinc-100">
                                    <AppointmentStatusActions
                                      appointmentId={appointment.id}
                                      selectedDateIso={selectedDateIso}
                                    />
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>

                        {/* Cancelled / Historical Section */}
                        {cancelledAppointments.length > 0 ? (
                          <div
                            className="p-3 border-t border-zinc-200 bg-zinc-50/80 space-y-2"
                            data-testid={`cancelled-history-${specialist.id}`}
                          >
                            <h4 className="text-2xs font-bold uppercase tracking-wider text-zinc-500">
                              Cancelled ({cancelledAppointments.length})
                            </h4>
                            {cancelledAppointments.map((appointment) => {
                              const serviceNames = appointment.services
                                .map((row) => row.service.name)
                                .join(", ");
                              const contact = getAppointmentContactDisplay(appointment);
                              return (
                                <article
                                  key={appointment.id}
                                  data-testid={`admin-appointment-${appointment.id}`}
                                  className="rounded-md border border-zinc-200 bg-white p-2 text-xs opacity-80"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="line-through font-medium text-zinc-600 tabular-nums">
                                      {formatTime(appointment.startsAt)} –{" "}
                                      {formatTime(appointment.endsAt)}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${statusBadgeClass(
                                        appointment.status,
                                      )}`}
                                    >
                                      Cancelled
                                    </span>
                                  </div>
                                  <p className="text-zinc-700 mt-0.5">{serviceNames}</p>
                                  <p className="text-zinc-600 font-medium">
                                    {contact.customerName}
                                    <span className="font-normal text-zinc-500">
                                      {" "}
                                      · {specialist.name}
                                    </span>
                                  </p>
                                  {contact.customerPhone ? (
                                    <a
                                      href={`tel:${contact.customerPhone}`}
                                      className="text-zinc-600 underline text-2xs"
                                      data-testid={`admin-appointment-phone-${appointment.id}`}
                                    >
                                      {formatPhoneDisplay(contact.customerPhone)}
                                    </a>
                                  ) : null}
                                </article>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
