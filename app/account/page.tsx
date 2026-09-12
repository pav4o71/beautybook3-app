import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { linkGuestAppointmentsToVerifiedUser } from "@/lib/link-guest-appointments";
import {
  pageTitleClass,
  pageLeadClass,
  pageMainClass,
  surfaceClass,
  infoAlertClass,
  successAlertClass,
} from "@/lib/ui";
import { firstQueryValue } from "@/lib/validations/booking";
import { AccountAppointmentList } from "./appointment-list";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string | string[] }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;
  const query = await searchParams;

  // If email is not verified, do not allow access to account data
  if (!user.emailVerified) {
    redirect("/verify-email");
  }

  // Idempotent reconciliation: link any still-unowned guest appointments.
  // Safe to run on every page load — updateMany with conditional WHERE is atomic.
  if (user.emailVerified && user.email) {
    await linkGuestAppointmentsToVerifiedUser(user.id).catch(() => {
      // Non-fatal — silently continue
    });
  }

  // Load customer appointments authorized by customerId == current user
  // NEVER queries by email for page rendering
  const appointments = await prisma.appointment.findMany({
    where: { customerId: user.id },
    orderBy: { startsAt: "desc" },
    include: {
      organization: { select: { name: true } },
      location: { select: { name: true, address: true } },
      staff: { select: { name: true } },
      services: {
        include: {
          service: { select: { name: true } },
        },
      },
    },
    take: 100,
  });

  return (
    <>
      <SiteHeader />
      <main className={pageMainClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className={pageTitleClass}>My account</h1>
            <p className={pageLeadClass}>
              {user.name} &middot; {user.email}
              {user.emailVerified ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Verified
                </span>
              ) : null}
            </p>
          </div>
          <SignOutButton />
        </div>

        {firstQueryValue(query.booked) === "1" ? (
          <p className={successAlertClass}>Booked! Pay at the salon when you arrive.</p>
        ) : null}

        <div className={`${surfaceClass} p-6`}>
          <h2 className="mb-4 text-base font-semibold text-zinc-900">My appointments</h2>
          {appointments.length === 0 ? (
            <p className={infoAlertClass}>
              No appointments linked to your account yet. If you booked as a guest using
              this email address, those appointments will appear here once they are matched.
            </p>
          ) : (
            <AccountAppointmentList appointments={appointments} />
          )}
        </div>
      </main>
    </>
  );
}
