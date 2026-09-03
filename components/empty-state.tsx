import type { ReactNode } from "react";
import { emptyStateClass, sectionTitleClass } from "@/lib/ui";

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className={emptyStateClass} role="status">
      <h2 className={sectionTitleClass}>{title}</h2>
      {description ? <p className="mt-1">{description}</p> : null}
      {children ? <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
