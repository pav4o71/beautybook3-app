import Link from "next/link";
import { notFound } from "next/navigation";
import { StorefrontSections } from "@/app/s/[orgSlug]/storefront-sections";
import { getSalonStorefront } from "@/lib/salon";
import { pageMainClass, secondaryButtonClass } from "@/lib/ui";

export default async function SalonLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const salon = await getSalonStorefront(orgSlug);

  if (!salon) {
    notFound();
  }

  const preselectName = query.service?.trim().toLowerCase();
  const initialServiceIds = preselectName
    ? salon.categories
        .flatMap((category) => category.services)
        .filter((service) => service.name.toLowerCase() === preselectName)
        .map((service) => service.id)
    : [];

  const staffByLocation = salon.locations
    .map((location) => ({
      location,
      staff: salon.staff.filter((person) => person.locationId === location.id),
    }))
    .filter((group) => group.staff.length > 0);

  return (
    <main className={pageMainClass}>
      <Link href="/" className={secondaryButtonClass}>
        Back to search
      </Link>

      <StorefrontSections
        salon={salon}
        orgSlug={orgSlug}
        initialServiceIds={initialServiceIds}
        staffByLocation={staffByLocation}
      />

      {salon.categories.length > 0 ? (
        <div>
          <Link href="/" className={secondaryButtonClass}>
            Back to search
          </Link>
        </div>
      ) : null}
    </main>
  );
}
