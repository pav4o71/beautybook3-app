"use client";

import { MANILA_AREAS } from "@/lib/areas";
import { controlClass, labelClass, labelTextClass } from "@/lib/ui";

interface AreaFilterProps {
  selectedArea: string;
  onAreaChange: (area: string) => void;
}

export function AreaFilter({ selectedArea, onAreaChange }: AreaFilterProps) {
  return (
    <label className={labelClass}>
      <span className={labelTextClass}>Area</span>
      <select
        value={selectedArea}
        onChange={(event) => onAreaChange(event.target.value)}
        className={controlClass}
        data-testid="area-filter"
        aria-describedby="area-filter-help"
      >
        <option value="">All areas</option>
        {MANILA_AREAS.map((area) => (
          <option key={area} value={area}>
            {area}
          </option>
        ))}
      </select>
      <p id="area-filter-help" className="text-xs text-zinc-500">
        Optional — narrow results by Manila area.
      </p>
    </label>
  );
}
