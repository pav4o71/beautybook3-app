export const focusRingClass =
  "outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2";

export const controlClass =
  `w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 ${focusRingClass} focus:border-zinc-900`;

export const controlCompactClass =
  `min-h-10 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 ${focusRingClass} focus:border-zinc-900`;

export const labelClass = "block space-y-1.5 text-sm";

export const labelTextClass = "font-medium text-zinc-900";

export const brandLinkClass =
  `rounded-sm text-sm font-semibold tracking-tight text-stone-900 ${focusRingClass}`;

export const textLinkClass =
  `inline-flex min-h-10 items-center rounded-sm px-2 text-sm text-zinc-600 hover:text-zinc-900 ${focusRingClass}`;

export const pageShellClass = "mx-auto w-full max-w-5xl px-4";

export const pageMainClass = `${pageShellClass} flex flex-1 flex-col gap-6 py-8 sm:py-10`;

export const pageTitleClass =
  "text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl";

export const sectionTitleClass = "text-lg font-semibold tracking-tight text-zinc-900";

export const pageLeadClass = "max-w-xl text-sm text-zinc-600";

export const surfaceClass = "rounded-lg border border-zinc-200 bg-white";

export const surfaceInteractiveClass =
  `${surfaceClass} transition hover:border-zinc-300 hover:shadow-sm`;

export const primaryButtonClass =
  `inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 ${focusRingClass}`;

export const secondaryButtonClass =
  `inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 ${focusRingClass}`;

export const dangerButtonClass =
  `inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 ${focusRingClass}`;

export const cardButtonClass =
  `w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-left text-sm text-zinc-900 transition hover:border-zinc-400 ${focusRingClass}`;

export const cardButtonSelectedClass =
  `w-full rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-3 text-left text-sm text-white transition ${focusRingClass}`;

export const errorAlertClass =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700";

export const successAlertClass =
  "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900";

export const infoAlertClass =
  "rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700";

export const slotButtonClass =
  `inline-flex min-h-10 min-w-16 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 ${focusRingClass}`;

export const checkboxClass =
  "size-4 rounded border-zinc-300 text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900";

export const chipClass =
  "inline-flex shrink-0 items-center rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900";

export const chipActiveClass =
  "inline-flex shrink-0 items-center rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white";

export const emptyStateClass =
  "rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-600";

export const navChipClass =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900";

export const navChipActiveClass =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white";
