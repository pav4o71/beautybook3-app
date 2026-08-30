export const MAX_BOOKING_SERVICES = 6;
export const MAX_COMBINED_DURATION_MIN = 240;

export const NO_STAFF_FOR_COMBINATION =
  "No staff can do this combination — deselect some services.";

export function staffOffersAllServices(
  staffServiceIds: readonly string[],
  selectedServiceIds: readonly string[],
) {
  if (selectedServiceIds.length === 0) {
    return false;
  }
  const offered = new Set(staffServiceIds);
  return selectedServiceIds.every((id) => offered.has(id));
}

export function firstLocationWithCapableStaff(
  locations: readonly { id: string }[],
  staff: readonly { locationId: string; serviceIds: readonly string[] }[],
  selectedServiceIds: readonly string[],
): string | undefined {
  if (selectedServiceIds.length === 0) {
    return undefined;
  }
  for (const location of locations) {
    const capable = staff.some(
      (person) =>
        person.locationId === location.id &&
        staffOffersAllServices(person.serviceIds, selectedServiceIds),
    );
    if (capable) {
      return location.id;
    }
  }
  return undefined;
}

