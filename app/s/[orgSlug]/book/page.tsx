import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { getAvailableSlots, getAvailableSlotsForDay } from "@/lib/booking";
import { MAX_COMBINED_DURATION_MIN, staffOffersAllServices } from "@/lib/booking-limits";
import { listBookingServices, listBookingStaff } from "@/lib/catalog";
import { getPublishedOrganizationBySlug } from "@/lib/tenant";
import { resolveSelectedServiceIds, firstQueryValue } from "@/lib/validations/booking";
import { pageMainClass, secondaryButtonClass, successAlertClass } from "@/lib/ui";
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
  const organization = await getPublishedOrganizationBySlug(orgSlug);

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
      <div className="space-y-1">
        <p className="text-sm text-zinc-600">
          <Link href={`/s/${orgSlug}`} className="hover:text-zinc-900">
            {organization.name}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Book online</h1>
        <p className="text-sm text-zinc-600">
          Choose a location and one or more services, then pick staff and a time. Pay at the
          salon when you arrive.
        </p>
      </div>

      {firstQueryValue(query.booked) === "1" ? (
        <p className={successAlertClass}>Booked! Pay at the salon when you arrive.</p>
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
        />
      )}
    </main>
  );
}
