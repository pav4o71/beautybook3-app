import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { getAvailableSlots, getAvailableSlotsForDay } from "@/lib/booking";
import { MAX_COMBINED_DURATION_MIN, staffOffersAllServices } from "@/lib/booking-limits";
import { listBookingServices, listBookingStaff } from "@/lib/catalog";
import { getPublishedOrganizationBySlug } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { resolveSelectedServiceIds, firstQueryValue } from "@/lib/validations/booking";
import { pageMainClass, secondaryButtonClass } from "@/lib/ui";
import { BookingForm } from "@/app/dashboard/book/booking-form";
import { bookPublicSlot } from "./actions";

export default async function PublicBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    serviceId?: string | string[];
    serviceIds?: string | string[];
    staffId?: string | string[];
    locationId?: string | string[];
    startsAt?: string | string[];
    booked?: string | string[];
  }>;
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const [organization, session] = await Promise.all([
    getPublishedOrganizationBySlug(orgSlug),
    getSession(),
  ]);

  if (!organization) {
    notFound();
  }

  if (organization.locations.length === 0) {
    notFound();
  }

  const requestedLocationId = firstQueryValue(query.locationId);
  const locationId =
    requestedLocationId &&
    organization.locations.some((location) => location.id === requestedLocationId)
      ? requestedLocationId
      : organization.locations[0].id;

  const [services, staff] = await Promise.all([
    listBookingServices(organization.id),
    listBookingStaff(organization.id),
  ]);

  const selectedIds = resolveSelectedServiceIds(
    query,
    services.map((service) => service.id),
  );

  const staffAtLocation = staff.filter((person) => person.locationId === locationId);
  const staffForServices = staffAtLocation.filter((person) =>
    staffOffersAllServices(
      person.services.map((row) => row.serviceId),
      selectedIds,
    ),
  );
  const requestedStaffId = firstQueryValue(query.staffId);
  const staffId =
    requestedStaffId && staffForServices.some((person) => person.id === requestedStaffId)
      ? requestedStaffId
      : (staffForServices[0]?.id ?? "");

  const selectedServices = services.filter((service) => selectedIds.includes(service.id));
  const durationMin = selectedServices.reduce(
    (sum, service) => sum + service.durationMin,
    0,
  );
  const requestedStartsAtRaw = firstQueryValue(query.startsAt);
  const requestedStartsAt = requestedStartsAtRaw ? new Date(requestedStartsAtRaw) : null;
  const hasRequestedStartsAt =
    requestedStartsAt != null && !Number.isNaN(requestedStartsAt.getTime());

  let slots: Date[] = [];
  if (staffId && selectedServices.length > 0 && durationMin <= MAX_COMBINED_DURATION_MIN) {
    slots = await getAvailableSlots({
      organizationId: organization.id,
      staffId,
      durationMin,
    });
    if (hasRequestedStartsAt) {
      const daySlots = await getAvailableSlotsForDay({
        organizationId: organization.id,
        staffId,
        durationMin,
        date: requestedStartsAt,
      });
      const seen = new Set(slots.map((slot) => slot.getTime()));
      slots = [...slots, ...daySlots.filter((slot) => !seen.has(slot.getTime()))].sort(
        (left, right) => left.getTime() - right.getTime(),
      );
    }
  }

  const bookAction = bookPublicSlot.bind(null, orgSlug);

  return (
    <main className={pageMainClass}>
      <nav aria-label="Breadcrumb">
        <Link
          href={`/s/${orgSlug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
        >
          <span aria-hidden="true">←</span> Back to {organization.name}
        </Link>
      </nav>

      <div className="space-y-2 border-b border-zinc-200/80 pb-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Booking
          </span>
          <span className="text-xs text-zinc-400">·</span>
          <span className="text-xs font-medium text-zinc-500">{organization.name}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Book online
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
          Choose a location and one or more services, then pick staff and a time. Pay at
          the salon when you arrive.
        </p>
      </div>

      {firstQueryValue(query.booked) === "1" ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 shadow-xs">
          <svg
            className="size-5 shrink-0 text-emerald-600"
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
          <p className="text-sm font-medium text-emerald-900">
            Booked! Pay at the salon when you arrive.
          </p>
        </div>
      ) : null}

      {services.length === 0 ? (
        <EmptyState
          title="Nothing to book yet"
          description="This salon has not published bookable services."
        >
          <Link href={`/s/${orgSlug}`} className={secondaryButtonClass}>
            Back to salon
          </Link>
        </EmptyState>
      ) : (
        <BookingForm
          key={`${locationId}-${selectedIds.join(",")}-${staffId}`}
          bookPath={`/s/${orgSlug}/book`}
          action={bookAction}
          locations={organization.locations.map((location) => ({
            id: location.id,
            name: location.name,
          }))}
          initialLocationId={locationId}
          services={services.map((service) => ({
            id: service.id,
            name: service.name,
            durationMin: service.durationMin,
            priceCents: service.priceCents,
            categoryName: service.category.name,
          }))}
          staff={staff.map((person) => ({
            id: person.id,
            name: person.name,
            locationId: person.locationId,
            serviceIds: person.services.map((row) => row.serviceId),
          }))}
          initialServiceIds={selectedIds}
          initialStaffId={staffId}
          initialStartsAt={
            requestedStartsAtRaw &&
            slots.some(
              (slot) => slot.getTime() === new Date(requestedStartsAtRaw).getTime(),
            )
              ? requestedStartsAtRaw
              : ""
          }
          slots={slots.map((slot) => slot.toISOString())}
          requireContactInfo={true}
          defaultCustomerName={session?.user?.name ?? ""}
          defaultCustomerEmail={session?.user?.email ?? ""}
          defaultCustomerPhone={(session?.user && "phone" in session.user ? (session.user as { phone?: string | null }).phone ?? "" : "")}
        />
      )}
    </main>
  );
}
