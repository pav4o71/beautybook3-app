import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export default async function ServicesPage() {
  await requireUser();

  const categories = await prisma.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      services: {
        where: { active: true },
        orderBy: { name: "asc" },
      },
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
      <div className="mt-6 space-y-8">
        {categories.map((category) => (
          <section key={category.id} className="space-y-3">
            <h2 className="text-lg font-medium">{category.name}</h2>
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
              {category.services.map((service) => (
                <li key={service.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{service.name}</p>
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
    </main>
  );
}
