"use client";

import { controlCompactClass } from "@/lib/ui";
import { switchOrganization } from "./actions";

export function OrgSwitcher({
  memberships,
  activeOrgId,
}: {
  memberships: { organizationId: string; organization: { name: string } }[];
  activeOrgId: string;
}) {
  if (memberships.length <= 1) {
    return memberships[0] ? (
      <span className="block min-w-0 truncate text-sm text-zinc-500">
        {memberships[0].organization.name}
      </span>
    ) : null;
  }

  return (
    <form action={switchOrganization} className="min-w-0 w-full sm:w-auto">
      <label className="sr-only" htmlFor="organizationId">
        Active business
      </label>
      <select
        id="organizationId"
        name="organizationId"
        defaultValue={activeOrgId}
        className={`${controlCompactClass} w-full max-w-full`}
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit();
        }}
      >
        {memberships.map((row) => (
          <option key={row.organizationId} value={row.organizationId}>
            {row.organization.name}
          </option>
        ))}
      </select>
    </form>
  );
}
