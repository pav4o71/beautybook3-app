import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { formatPrice } from "@/lib/format";
import { listCustomerCatalog } from "@/lib/catalog";
import { requireActiveOrgContext } from "@/lib/require-org";
import { pageMainClass, primaryButtonClass } from "@/lib/ui";

export default async function ServicesPage() {
  const { organizationId } = await requireActiveOrgContext();

  const categories = await listCustomerCatalog(organizationId);

  return (
    <main className={pageMainClass}>
      <PageHeader
        title="Services"
        lead="Hair and nail treatments you can book."
        actions={
          <Link href="/dashboard/book" className={primaryButtonClass}>
            Book
          </Link>
        }
      />
      {categories.length === 0 ? (
        <EmptyState
          title="No services yet"
          description="Ask the salon to add treatments in admin."
        />
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <section key={category.id} className="space-y-3">
              <h2 className="text-lg font-medium text-zinc-900">{category.name}</h2>
              <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                {category.services.map((service) => (
                  <li
                    key={service.id}
                    className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div>
                      <p className="font-medium text-zinc-900">{service.name}</p>
                      {service.description ? (
                        <p className="text-sm text-zinc-600">{service.description}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm text-zinc-700">
                      {service.durationMin} min · {formatPrice(service.priceCents)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
