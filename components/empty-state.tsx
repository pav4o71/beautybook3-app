import type { ReactNode } from "react";
import { emptyStateClass } from "@/lib/ui";

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
    <div className={emptyStateClass}>
      <p className="font-medium text-zinc-900">{title}</p>
      {description ? <p className="mt-1">{description}</p> : null}
      {children ? <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
