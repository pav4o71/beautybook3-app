import Link from "next/link";
import { notFound } from "next/navigation";
import { getAvailableSlots } from "@/lib/booking";
import { listBookingServices, listBookingStaff } from "@/lib/catalog";
import { getPublishedOrganizationBySlug } from "@/lib/tenant";
import { successAlertClass } from "@/lib/ui";
import { BookingForm } from "@/app/dashboard/book/booking-form";
import { bookPublicSlot } from "./actions";

export default async function PublicBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{
    serviceId?: string;
    staffId?: string;
    locationId?: string;
    booked?: string;
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

  const locationId =
    query.locationId &&
    organization.locations.some((location) => location.id === query.locationId)
      ? query.locationId
      : organization.locations[0].id;

  const [services, staff] = await Promise.all([
    listBookingServices(organization.id),
    listBookingStaff(organization.id, locationId),
  ]);

  const serviceId =
    query.serviceId && services.some((service) => service.id === query.serviceId)
      ? query.serviceId
      : (services[0]?.id ?? "");

  const staffForService = staff.filter((person) =>
    person.services.some((row) => row.serviceId === serviceId),
  );
  const staffId =
    query.staffId && staffForService.some((person) => person.id === query.staffId)
      ? query.staffId
      : (staffForService[0]?.id ?? "");

  const selectedService = services.find((service) => service.id === serviceId);
  const slots =
    staffId && selectedService
      ? await getAvailableSlots({
          organizationId: organization.id,
          staffId,
          durationMin: selectedService.durationMin,
        })
      : [];

  const bookAction = bookPublicSlot.bind(null, orgSlug);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-600">
            <Link href={`/s/${orgSlug}`} className="hover:text-zinc-900">
              {organization.name}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Book online</h1>
        </div>
        <Link
          href="/login"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          Sign in
        </Link>
      </div>

      {query.booked === "1" ? (
        <p className={`mb-4 ${successAlertClass}`}>
          Booked! Pay at the salon when you arrive.
        </p>
      ) : null}

      <p className="mb-6 text-sm text-zinc-600">
        Choose a location, service, and staff member, then pick a time. Pay at the salon when you arrive.
      </p>

      {services.length === 0 ? (
        <p className="text-sm text-zinc-600">Nothing to book yet.</p>
      ) : (
        <BookingForm
          key={`${locationId}-${serviceId}-${staffId}`}
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
            serviceIds: person.services.map((row) => row.serviceId),
          }))}
          initialServiceId={serviceId}
          initialStaffId={staffId}
          slots={slots.map((slot) => slot.toISOString())}
        />
      )}
    </main>
  );
}
