import Link from "next/link";

const iconMap: Record<string, string> = {
  hair: "💇",
  nails: "💅",
  scissors: "💇",
  sparkles: "💅",
};

export function CategoryCard({
  category,
  href,
}: {
  category: {
    slug: string;
    name: string;
    salonCount: number;
    icon?: string | null;
    description?: string | null;
  };
  href: string;
}) {
  const icon = iconMap[category.icon ?? category.slug] ?? "✨";

  return (
    <Link
      href={href}
      className="block rounded-lg border border-zinc-300 bg-white px-4 py-6 text-left transition hover:border-zinc-400"
      data-testid={`category-${category.slug}`}
    >
      <div className="mb-3 text-3xl">{icon}</div>
      <h3 className="text-lg font-medium text-zinc-900">{category.name}</h3>
      <p className="mt-1 text-sm text-zinc-600">
        {category.salonCount} salon{category.salonCount === 1 ? "" : "s"}
      </p>
      {category.description ? (
        <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{category.description}</p>
      ) : null}
    </Link>
  );
}
