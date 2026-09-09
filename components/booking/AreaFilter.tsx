"use client";

import { MANILA_AREAS } from "@/lib/areas";
import { controlClass, labelClass, labelTextClass } from "@/lib/ui";

interface AreaFilterProps {
  selectedArea: string;
  onAreaChange: (area: string) => void;
  controlClassName?: string;
  labelTextClassName?: string;
  helpClassName?: string;
}

export function AreaFilter({
  selectedArea,
  onAreaChange,
  controlClassName = controlClass,
  labelTextClassName = labelTextClass,
  helpClassName = "text-xs text-zinc-500",
}: AreaFilterProps) {
  return (
    <label className={labelClass}>
      <span className={labelTextClassName}>Area</span>
      <select
        value={selectedArea}
        onChange={(event) => onAreaChange(event.target.value)}
        className={controlClassName}
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
      <p id="area-filter-help" className={helpClassName}>
        Optional — narrow results by Manila area.
      </p>
    </label>
  );
}
