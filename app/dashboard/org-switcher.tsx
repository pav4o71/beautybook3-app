"use client";

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
      <span className="text-xs text-zinc-500">{memberships[0].organization.name}</span>
    ) : null;
  }

  return (
    <form action={switchOrganization}>
      <label className="sr-only" htmlFor="organizationId">
        Active business
      </label>
      <select
        id="organizationId"
        name="organizationId"
        defaultValue={activeOrgId}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900"
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
