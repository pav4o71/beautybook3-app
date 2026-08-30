import type { Weekday } from "@/app/generated/prisma/enums";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDay, formatTime } from "@/lib/format";
import { getStaffById } from "@/lib/catalog";
import { requireAdmin } from "@/lib/require-admin";
import {
  getStaffSchedules,
  listStaffTimeOff,
  orderedWeekdays,
  weekdayLabel,
} from "@/lib/schedule";
import {
  checkboxClass,
  controlClass,
  dangerButtonClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";
import { ActionForm } from "../../../action-form";
import { createTimeOff, deleteTimeOff, saveWeekdaySchedule } from "./actions";

function schedulesForWeekday(
  schedules: Awaited<ReturnType<typeof getStaffSchedules>>,
  weekday: Weekday,
) {
  return schedules
    .filter((row) => row.weekday === weekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export default async function StaffSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const person = await getStaffById(id);
  if (!person) {
    notFound();
  }

  const [schedules, timeOff] = await Promise.all([
    getStaffSchedules(id),
    listStaffTimeOff(id),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Schedule — {person.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Weekly hours and time off. Changes apply to the booking calendar immediately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/admin/staff/${id}`} className={secondaryButtonClass}>
            Edit profile
          </Link>
          <Link href="/dashboard/admin/staff" className={secondaryButtonClass}>
            Back to staff
          </Link>
        </div>
      </div>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-medium text-zinc-900">Weekly hours</h2>
        {orderedWeekdays().map((weekday) => {
          const daySchedules = schedulesForWeekday(schedules, weekday);
          const closed = daySchedules.length === 0;
          const primary = daySchedules[0];
          const split = daySchedules[1];

          return (
            <ActionForm
              key={weekday}
              action={saveWeekdaySchedule}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <input type="hidden" name="staffId" value={id} />
              <input type="hidden" name="weekday" value={weekday} />
              <div className="flex flex-wrap items-end gap-4">
                <p className="w-28 shrink-0 text-sm font-medium text-zinc-900">
                  {weekdayLabel(weekday)}
                </p>
                <label className="flex items-center gap-2 pb-2 text-sm text-zinc-900">
                  <input
                    type="checkbox"
                    name="closed"
                    defaultChecked={closed}
                    className={checkboxClass}
                  />
                  Closed
                </label>
                <label className={labelClass}>
                  <span className={labelTextClass}>Start</span>
                  <input
                    name="startTime"
                    type="time"
                    defaultValue={primary?.startTime ?? "09:00"}
                    className={controlClass}
                  />
                </label>
                <label className={labelClass}>
                  <span className={labelTextClass}>End</span>
                  <input
                    name="endTime"
                    type="time"
                    defaultValue={primary?.endTime ?? "17:00"}
                    className={controlClass}
                  />
                </label>
                <label className={labelClass}>
                  <span className={labelTextClass}>Split start</span>
                  <input
                    name="startTime2"
                    type="time"
                    defaultValue={split?.startTime ?? ""}
                    className={controlClass}
                  />
                </label>
                <label className={labelClass}>
                  <span className={labelTextClass}>Split end</span>
                  <input
                    name="endTime2"
                    type="time"
                    defaultValue={split?.endTime ?? ""}
                    className={controlClass}
                  />
                </label>
                <button type="submit" className={secondaryButtonClass}>
                  Save day
                </button>
              </div>
              {!closed ? (
                <p className="mt-2 text-xs text-zinc-600">
                  Open:{" "}
                  {daySchedules
                    .map((row) => `${row.startTime}–${row.endTime}`)
                    .join(", ")}
                </p>
              ) : (
                <p className="mt-2 text-xs text-zinc-600">Closed all day</p>
              )}
            </ActionForm>
          );
        })}
      </section>

      <section className="mt-10 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-medium text-zinc-900">Add time off</h2>
        <ActionForm action={createTimeOff} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="staffId" value={id} />
          <label className={labelClass}>
            <span className={labelTextClass}>Start date</span>
            <input name="startDate" type="date" required className={controlClass} />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Start time</span>
            <input name="startTime" type="time" required className={controlClass} />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>End date</span>
            <input name="endDate" type="date" required className={controlClass} />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>End time</span>
            <input name="endTime" type="time" required className={controlClass} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            <span className={labelTextClass}>Reason (optional)</span>
            <input name="reason" className={controlClass} placeholder="Vacation, training…" />
          </label>
          <div className="flex items-end">
            <button type="submit" className={primaryButtonClass}>
              Add time off
            </button>
          </div>
        </ActionForm>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-medium text-zinc-900">Time off blocks</h2>
        {timeOff.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No time off scheduled.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {timeOff.map((block) => (
              <li
                key={block.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {formatDay(block.startsAt)} {formatTime(block.startsAt)} –{" "}
                    {formatDay(block.endsAt)} {formatTime(block.endsAt)}
                  </p>
                  {block.reason ? (
                    <p className="text-sm text-zinc-600">{block.reason}</p>
                  ) : null}
                </div>
                <form action={deleteTimeOff}>
                  <input type="hidden" name="id" value={block.id} />
                  <input type="hidden" name="staffId" value={id} />
                  <button type="submit" className={dangerButtonClass}>
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
