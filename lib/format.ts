import { SALON_TIMEZONE } from "@/lib/timezone";

export function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(priceCents / 100);
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    timeZone: SALON_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(date: Date) {
  return date.toLocaleDateString("en-GB", {
    timeZone: SALON_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
