import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getAppointmentByManagementToken } from "@/lib/appointment-management-token";
import {
  appointmentPayCopy,
  statusBadgeClass,
  statusLabel,
} from "@/lib/appointment-status";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import {
  pageMainClass,
  pageTitleClass,
  secondaryButtonClass,
  surfaceClass,
} from "@/lib/ui";
import { firstQueryValue } from "@/lib/validations/booking";
import { CopyLinkButton } from "./copy-link-button";

export const metadata: Metadata = {
  title: "Appointment Details | BeautyBook",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function AppointmentManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ booked?: string | string[] }>;
}) {
  const { token } = await params;
  const query = await searchParams;

  const appointment = await getAppointmentByManagementToken(token);
  if (!appointment) {
    notFound();
  }

  const isJustBooked = firstQueryValue(query.booked) === "1";
  const totalCents = appointment.services.reduce((sum, s) => sum + s.priceCents, 0);
  const totalDurationMin = appointment.services.reduce((sum, s) => sum + s.durationMin, 0);
  const payCopy = appointmentPayCopy(appointment.status, totalCents);

  return (
    <>
      <SiteHeader />
      <main className={pageMainClass}>
        {isJustBooked ? (
          <section
            data-testid="booking-success-state"
            className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center shadow-xs sm:p-8"
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 sm:size-14">
              <svg
                className="size-7 sm:size-8"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Booking confirmed!
            </h1>
            <p className="mt-2 text-sm font-medium text-emerald-900 sm:text-base">
              Booked! Pay at the salon when you arrive.
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Save this link to manage your appointment anytime.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <CopyLinkButton />
              <Link
                href={`/s/${appointment.organization.slug}/book`}
                className={secondaryButtonClass}
              >
                Book another appointment
              </Link>
              <Link
                href={`/s/${appointment.organization.slug}`}
                className={secondaryButtonClass}
              >
                View salon
              </Link>
            </div>
          </section>
        ) : null}

        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {appointment.organization.name}
              </span>
              <h1 className={pageTitleClass}>Appointment details</h1>
              <p className="mt-1 text-sm text-zinc-600">
                {appointment.location.name}
                {appointment.location.area ? ` · ${appointment.location.area}` : ""}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(appointment.status)}`}
            >
              {statusLabel(appointment.status)}
            </span>
          </div>

          <article className={`${surfaceClass} divide-y divide-zinc-200`}>
            <div className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    When
                  </h2>
                  <p className="mt-1 font-semibold text-zinc-900">
                    {formatDay(appointment.startsAt)}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)} ({totalDurationMin} min)
                  </p>
                </div>

                <div>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Specialist
                  </h2>
                  <p className="mt-1 font-semibold text-zinc-900">
                    {appointment.staff.name}
                  </p>
                  {appointment.customerName ? (
                    <p className="text-sm text-zinc-600">
                      Booked for <span className="font-medium text-zinc-900">{appointment.customerName}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {appointment.location.address ? (
                <div>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Where
                  </h2>
                  <p className="mt-1 text-sm text-zinc-800">
                    {appointment.location.address}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="p-6 space-y-4">
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Services
              </h2>
              <ul className="divide-y divide-zinc-100">
                {appointment.services.map((row) => (
                  <li
                    key={row.serviceId}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-zinc-900">{row.service.name}</span>
                      <span className="ml-2 text-xs text-zinc-500">({row.durationMin} min)</span>
                    </div>
                    <span className="font-medium text-zinc-900">
                      {formatPrice(row.priceCents)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-base font-semibold text-zinc-900">
                <span>Total</span>
                <span>{formatPrice(totalCents)}</span>
              </div>

              {payCopy ? (
                <p className={payCopy.className}>{payCopy.text}</p>
              ) : null}
            </div>

            <div className="p-6 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-500">
                  Save this private management receipt link for your appointment.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <CopyLinkButton />
                {!isJustBooked ? (
                  <Link
                    href={`/s/${appointment.organization.slug}`}
                    className={secondaryButtonClass}
                  >
                    View salon
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}
