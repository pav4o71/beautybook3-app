import type { ReactNode } from "react";
import { formatPrice } from "@/lib/format";
import { cardButtonClass, cardButtonSelectedClass } from "@/lib/ui";

type MarketplaceService = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  durationMin: number;
};

export function ServiceCard({
  service,
  isSelected = false,
  onClick,
  salonName,
  areaLabel,
  footer,
  testId,
}: {
  service: MarketplaceService;
  isSelected?: boolean;
  onClick?: () => void;
  salonName?: string;
  areaLabel?: string;
  footer?: ReactNode;
  testId?: string;
}) {
  const selected = Boolean(onClick && isSelected);
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-medium">{service.name}</h3>
          {salonName ? (
            <p className={`mt-1 text-sm ${selected ? "text-zinc-200" : "text-zinc-600"}`}>
              {salonName}
              {areaLabel ? ` · ${areaLabel}` : ""}
            </p>
          ) : null}
          {service.description ? (
            <p
              className={`mt-1 line-clamp-2 text-sm ${
                selected ? "text-zinc-200" : "text-zinc-600"
              }`}
            >
              {service.description}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="font-medium">{formatPrice(service.priceCents)}</p>
          <p className={`mt-0.5 text-xs ${selected ? "text-zinc-300" : "text-zinc-500"}`}>
            {service.durationMin} min
          </p>
        </div>
      </div>
      {footer}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={selected ? cardButtonSelectedClass : cardButtonClass}
        data-testid={testId ?? `service-${service.id}`}
      >
        {body}
      </button>
    );
  }

  return (
    <article
      className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-4"
      data-testid={testId ?? `service-result-${service.id}`}
    >
      {body}
    </article>
  );
}
