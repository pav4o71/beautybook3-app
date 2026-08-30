'use client'

interface AreaFilterProps {
  selectedArea: string
  onAreaChange: (area: string) => void
}

const manilaAreas = [
  'Makati',
  'BGC (Taguig)',
  'Quezon City',
  'Mandaluyong',
  'Pasig',
  'Ortigas',
  'Alabang',
  'Parañ±³³e',
  'Las Piñ±¡±',
  'Manila (City Proper)',
  'San Juan',
  'Pasay',
  'Taguig',
  'Marikina',
]

export function AreaFilter({ selectedArea, onAreaChange }: AreaFilterProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Filter by Area
      </label>
      <select
        value={selectedArea}
        onChange={(e) => onAreaChange(e.target.value)}
        className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
        data-testid="area-filter"
      >
        <option value="">All Areas</option>
        {manilaAreas.map((area) => (
          <option key={area} value={area}>
            {area}
          </option>
        ))}
      </select>
    </div>
  )
}
