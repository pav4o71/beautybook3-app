import type { ReactNode } from "react";
import { pageLeadClass, pageTitleClass } from "@/lib/ui";

type PageHeaderProps = {
  title: string;
  lead?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, lead, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h1 className={pageTitleClass}>{title}</h1>
        {lead ? <p className={pageLeadClass}>{lead}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
