"use client";

import { controlCompactClass } from "@/lib/ui";
import { switchLocation } from "./actions";

export function LocationSwitcher({
  locations,
  activeLocationId,
}: {
  locations: { id: string; name: string }[];
  activeLocationId: string;
}) {
  if (locations.length <= 1) {
    return locations[0] ? (
      <span className="block min-w-0 truncate text-sm text-zinc-500">
        {locations[0].name}
      </span>
    ) : null;
  }

  return (
    <form action={switchLocation} className="min-w-0 w-full sm:w-auto">
      <label className="sr-only" htmlFor="locationId">
        Active location
      </label>
      <select
        id="locationId"
        name="locationId"
        defaultValue={activeLocationId}
        className={`${controlCompactClass} w-full max-w-full`}
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit();
        }}
      >
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    </form>
  );
}
