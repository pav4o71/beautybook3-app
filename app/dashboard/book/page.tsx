import { getAvailableSlots } from "@/lib/booking";
import { listBookingServices, listBookingStaff } from "@/lib/catalog";
import { requireUser } from "@/lib/require-user";
import { BookingForm } from "./booking-form";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string; staffId?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  const [services, staff] = await Promise.all([
    listBookingServices(),
    listBookingStaff(),
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
          staffId,
          durationMin: selectedService.durationMin,
        })
      : [];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Book</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Choose a service and staff member, then pick a time. Your slot is held when
        you book; pay at the salon when you arrive. Available hours depend on each
        staff member&apos;s schedule.
      </p>
      <div className="mt-6">
        {services.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Nothing to book yet. Ask the salon to add services in admin.
          </p>
        ) : (
        <BookingForm
          key={`${serviceId}-${staffId}`}
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
