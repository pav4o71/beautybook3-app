"use client";

import { MANILA_AREAS } from "@/lib/areas";
import { controlClass, labelClass, labelTextClass } from "@/lib/ui";

interface AreaFilterProps {
  selectedArea: string;
  onAreaChange: (area: string) => void;
}

export function AreaFilter({ selectedArea, onAreaChange }: AreaFilterProps) {
  return (
    <div className="mb-6">
      <label className={labelClass}>
        <span className={labelTextClass}>Filter by area</span>
        <select
          value={selectedArea}
          onChange={(event) => onAreaChange(event.target.value)}
          className={controlClass}
          data-testid="area-filter"
        >
          <option value="">All areas</option>
          {MANILA_AREAS.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
