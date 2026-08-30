"use client";

import { formatPrice } from "@/lib/format";
import { cardButtonClass, cardButtonSelectedClass } from "@/lib/ui";

type MarketplaceService = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  durationMin: number;
};

interface ServiceCardProps {
  service: MarketplaceService;
  isSelected: boolean;
  onClick: () => void;
}

export function ServiceCard({ service, isSelected, onClick }: ServiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={isSelected ? cardButtonSelectedClass : cardButtonClass}
      data-testid={`service-${service.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-medium">{service.name}</h3>
          {service.description ? (
            <p
              className={`mt-1 line-clamp-2 text-sm ${
                isSelected ? "text-zinc-200" : "text-zinc-600"
              }`}
            >
              {service.description}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="font-medium">{formatPrice(service.priceCents)}</p>
          <p className={`mt-0.5 text-xs ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
            {service.durationMin} min
          </p>
        </div>
      </div>
    </button>
  );
}
