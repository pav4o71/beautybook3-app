"use client";

const iconMap: Record<string, string> = {
  scissors: "💇",
  sparkles: "💅",
  "flower-2": "🧘",
  user: "👨",
  brush: "💄",
  eye: "👁️",
  droplet: "💧",
  heart: "💆",
};

type MarketplaceCategory = {
  slug: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  _count: { services: number };
};

interface CategoryCardProps {
  category: MarketplaceCategory;
  onClick: () => void;
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const icon = iconMap[category.icon ?? ""] ?? "✨";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-zinc-300 bg-white p-6 text-left transition hover:border-zinc-400"
      data-testid={`category-card-${category.slug}`}
    >
      <div className="mb-3 text-4xl">{icon}</div>
      <h3 className="text-lg font-medium text-zinc-900">{category.name}</h3>
      <p className="mt-1 text-sm text-zinc-600">
        {category._count.services} service
        {category._count.services === 1 ? "" : "s"}
      </p>
      {category.description ? (
        <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{category.description}</p>
      ) : null}
    </button>
  );
}
