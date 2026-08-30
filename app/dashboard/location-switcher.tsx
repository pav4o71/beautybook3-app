"use client";

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
      <span className="text-xs text-zinc-500">{locations[0].name}</span>
    ) : null;
  }

  return (
    <form action={switchLocation}>
      <label className="sr-only" htmlFor="locationId">
        Active location
      </label>
      <select
        id="locationId"
        name="locationId"
        defaultValue={activeLocationId}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900"
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
