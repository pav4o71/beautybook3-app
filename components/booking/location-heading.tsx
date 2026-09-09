export function LocationHeading({
  name,
  isDefault,
  area,
}: {
  name: string;
  isDefault?: boolean;
  area?: string | null;
}) {
  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-medium text-zinc-900">
      <span className="break-words">{name}</span>
      {isDefault ? (
        <span className="inline-flex items-center rounded border border-emerald-200/80 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">
          Default
        </span>
      ) : null}
      {area ? (
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-700">
          {area}
        </span>
      ) : null}
    </p>
  );
}
