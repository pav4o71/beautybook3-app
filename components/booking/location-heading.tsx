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
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium text-zinc-900">
      <span>{name}</span>
      {isDefault ? (
        <span className="text-xs font-normal text-zinc-500">(default)</span>
      ) : null}
      {area ? (
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-700">
          {area}
        </span>
      ) : null}
    </p>
  );
}
