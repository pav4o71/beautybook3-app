import { getAvailableSlots } from "@/lib/booking";
import { MAX_COMBINED_DURATION_MIN, staffOffersAllServices } from "@/lib/booking-limits";
import { listBookingServices, listBookingStaff } from "@/lib/catalog";
import { requireActiveOrgContext } from "@/lib/require-org";
import { resolveSelectedServiceIds, firstQueryValue } from "@/lib/validations/booking";
import { pageMainClass } from "@/lib/ui";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { BookingForm } from "./booking-form";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    serviceId?: string | string[];
    serviceIds?: string | string[];
    staffId?: string | string[];
    locationId?: string | string[];
  }>;
}) {
  const { organizationId, locations, locationId: activeLocationId } =
    await requireActiveOrgContext();
  const params = await searchParams;
  const requestedLocationId = firstQueryValue(params.locationId);

  const locationId =
    requestedLocationId && locations.some((location) => location.id === requestedLocationId)
      ? requestedLocationId
      : activeLocationId;

  const [services, staff] = await Promise.all([
    listBookingServices(organizationId),
    listBookingStaff(organizationId),
  ]);

  const selectedIds = resolveSelectedServiceIds(
    params,
    services.map((service) => service.id),
  );

  const staffAtLocation = staff.filter((person) => person.locationId === locationId);
  const staffForServices = staffAtLocation.filter((person) =>
    staffOffersAllServices(
      person.services.map((row) => row.serviceId),
      selectedIds,
    ),
  );
  const requestedStaffId = firstQueryValue(params.staffId);
  const staffId =
    requestedStaffId && staffForServices.some((person) => person.id === requestedStaffId)
      ? requestedStaffId
      : (staffForServices[0]?.id ?? "");

  const selectedServices = services.filter((service) => selectedIds.includes(service.id));
  const durationMin = selectedServices.reduce(
    (sum, service) => sum + service.durationMin,
    0,
  );
  const slots =
    staffId && selectedServices.length > 0 && durationMin <= MAX_COMBINED_DURATION_MIN
      ? await getAvailableSlots({
          organizationId,
          staffId,
          durationMin,
        })
      : [];

  return (
    <main className={pageMainClass}>
      <PageHeader
        title="Book"
        lead="Choose a location and one or more services, then pick staff and a time. Your slot is held when you book; pay at the salon when you arrive."
      />
      {services.length === 0 ? (
        <EmptyState
          title="Nothing to book yet"
          description="Ask the salon to add services in admin."
        />
      ) : (
        <BookingForm
          key={`${locationId}-${selectedIds.join(",")}-${staffId}`}
          locations={locations.map((location) => ({
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
          slots={slots.map((slot) => slot.toISOString())}
        />
      )}
    </main>
  );
}
