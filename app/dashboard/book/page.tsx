import { getAvailableSlots } from "@/lib/booking";
import { listBookingServices, listBookingStaff } from "@/lib/catalog";
import { requireActiveOrgContext } from "@/lib/require-org";
import { BookingForm } from "./booking-form";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    serviceId?: string;
    staffId?: string;
    locationId?: string;
  }>;
}) {
  const { organizationId, locations, locationId: activeLocationId } =
    await requireActiveOrgContext();
  const params = await searchParams;

  const locationId =
    params.locationId && locations.some((location) => location.id === params.locationId)
      ? params.locationId
      : activeLocationId;

  const [services, staff] = await Promise.all([
    listBookingServices(organizationId),
    listBookingStaff(organizationId, locationId),
  ]);

  const serviceId =
    params.serviceId && services.some((service) => service.id === params.serviceId)
      ? params.serviceId
      : (services[0]?.id ?? "");

  const staffForService = staff.filter((person) =>
    person.services.some((row) => row.serviceId === serviceId),
  );
  const staffId =
    params.staffId && staffForService.some((person) => person.id === params.staffId)
      ? params.staffId
      : (staffForService[0]?.id ?? "");

  const selectedService = services.find((service) => service.id === serviceId);
  const slots =
    staffId && selectedService
      ? await getAvailableSlots({
          organizationId,
          staffId,
          durationMin: selectedService.durationMin,
        })
      : [];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Book</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Choose a location, service, and staff member, then pick a time. Your slot is held when
        you book; pay at the salon when you arrive.
      </p>
      <div className="mt-6">
        {services.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Nothing to book yet. Ask the salon to add services in admin.
          </p>
        ) : (
          <BookingForm
            key={`${locationId}-${serviceId}-${staffId}`}
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
              serviceIds: person.services.map((row) => row.serviceId),
            }))}
            initialServiceId={serviceId}
            initialStaffId={staffId}
            slots={slots.map((slot) => slot.toISOString())}
          />
        )}
      </div>
    </main>
  );
}
