'use client'

import { Location, Service, Tenant } from '@prisma/client'

interface BusinessCardProps {
  tenant: Tenant
  location: Location
  service: Service
  distance?: number
  rating?: number
  onBook: () => void
}

export function BusinessCard({
  tenant,
  location,
  service,
  distance,
  rating = 5.0,
  onBook,
}: BusinessCardProps) {
  return (
    <div
      className="p-4 border-2 border-gray-200 rounded-xl bg-white hover:shadow-lg transition-all duration-200"
      data-testid={`business-${tenant.id}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-gray-900">
              {tenant.name}
            </h3>
            <span className="flex items-center text-sm text-yellow-600">
              ⭐ {rating.toFixed(1)}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mt-1">
            {location.name}
          </p>
          
          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
            <span>📍</span>
            <span>{location.area}, {location.city}</span>
          </div>

          {distance && (
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
              <span>🚗</span>
              <span>{distance.toFixed(1)} km away</span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{service.name}</p>
              <p className="font-bold text-blue-600">
                ₱{Number(service.price).toLocaleString('en-PH')}
              </p>
            </div>
            <button
              onClick={onBook}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              data-testid={`book-now-${tenant.id}`}
            >
              Book Now
            </button>
          </div>
        </div>

        {tenant.logoUrl && (
          <img
            src={tenant.logoUrl}
            alt={tenant.name}
            className="w-16 h-16 rounded-lg object-cover ml-4"
          />
        )}
      </div>
    </div>
  )
}
