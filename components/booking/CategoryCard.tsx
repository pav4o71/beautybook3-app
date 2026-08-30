'use client'

type MarketplaceCategory = {
  slug: string
  name: string
  icon?: string | null
  description?: string | null
  _count: { services: number }
}

interface CategoryCardProps {
  category: MarketplaceCategory
  onClick: () => void
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const iconMap: Record<string, string> = {
    'scissors': '💇',
    'sparkles': '💅',
    'flower-2': '🧘',
    'user': '👨',
    'brush': '💄',
    'eye': '👁️',
    'droplet': '💧',
    'heart': '💆',
  }

  const icon = iconMap[category.icon || ''] || '✨'

  return (
    <button
      onClick={onClick}
      className="group p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 bg-white text-left w-full"
      data-testid={`category-${category.slug}`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600">
        {category.name}
      </h3>
      <p className="text-sm text-gray-500 mt-1">
        {category._count.services} services
      </p>
      {category.description && (
        <p className="text-xs text-gray-400 mt-2 line-clamp-2">
          {category.description}
        </p>
      )}
    </button>
  )
}
