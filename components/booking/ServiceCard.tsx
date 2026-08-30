'use client'

import { Service } from '@prisma/client'

interface ServiceCardProps {
  service: Service
  isSelected: boolean
  onClick: () => void
}

export function ServiceCard({ service, isSelected, onClick }: ServiceCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 border-2 rounded-xl transition-all duration-200 text-left ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow'
      }`}
      data-testid={`service-${service.id}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{service.name}</h3>
          {service.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {service.description}
            </p>
          )}
        </div>
        <div className="text-right ml-4">
          <p className="font-bold text-blue-600">
            ₱{Number(service.price).toLocaleString('en-PH')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {service.duration} min
          </p>
        </div>
      </div>
    </button>
  )
}
