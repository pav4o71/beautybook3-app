"use server";

import type { Weekday } from "@/app/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, type ActionFormState } from "@/lib/action-form-state";
import { parseOptionalString, parseRequiredString } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { requireActiveOrgAdmin } from "@/lib/require-org";
import {
  parseLocalDateTime,
  saveStaffWeekday,
  validateTimeWindow,
  weekdayLabel,
} from "@/lib/schedule";

function schedulePath(staffId: string) {
  return `/dashboard/admin/staff/${staffId}/schedule`;
}

function revalidateSchedulePaths(staffId: string) {
  revalidatePath(schedulePath(staffId));
  revalidatePath("/dashboard/book");
}

function parseWeekday(value: FormDataEntryValue | null): Weekday {
  const weekday = String(value ?? "") as Weekday;
  const allowed: Weekday[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  if (!allowed.includes(weekday)) {
    throw new Error("Invalid weekday.");
  }
  return weekday;
}

export async function saveWeekdaySchedule(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId } = await requireActiveOrgAdmin();

  let staffId = "";

  try {
    staffId = parseRequiredString(formData.get("staffId"), "Staff");
    const weekday = parseWeekday(formData.get("weekday"));
    const closed = formData.get("closed") === "on";

    const staff = await prisma.staff.findFirst({
      where: { id: staffId, organizationId },
    });
    if (!staff) {
      throw new Error("Staff member not found.");
    }
    if (!staff.locationId) {
      throw new Error("Staff member has no assigned location.");
    }

    if (closed) {
      await saveStaffWeekday(
        organizationId,
        staff.locationId,
        staffId,
        weekday,
        [],
      );
    } else {
      const startTime = parseRequiredString(formData.get("startTime"), "Start time");
      const endTime = parseRequiredString(formData.get("endTime"), "End time");
      const valid = validateTimeWindow(startTime, endTime);
      if (!valid.ok) {
        throw new Error(`${weekdayLabel(weekday)}: ${valid.error}`);
      }

      const start2 = String(formData.get("startTime2") ?? "").trim();
      const end2 = String(formData.get("endTime2") ?? "").trim();
      const windows = [{ startTime, endTime }];

      if (start2 || end2) {
        if (!start2 || !end2) {
          throw new Error(
            `${weekdayLabel(weekday)}: provide both split-shift times or leave them blank.`,
          );
        }
        const validSplit = validateTimeWindow(start2, end2);
        if (!validSplit.ok) {
          throw new Error(`${weekdayLabel(weekday)} split shift: ${validSplit.error}`);
        }
        windows.push({ startTime: start2, endTime: end2 });
      }

      await saveStaffWeekday(
        organizationId,
        staff.locationId,
        staffId,
        weekday,
        windows,
      );
    }
  } catch (error) {
    return actionError(error);
  }

  revalidateSchedulePaths(staffId);
  redirect(schedulePath(staffId));
}

export async function createTimeOff(
  _prevState: ActionFormState,
  formData: FormData,
): Promise<ActionFormState> {
  const { organizationId } = await requireActiveOrgAdmin();

  let staffId = "";

  try {
    staffId = parseRequiredString(formData.get("staffId"), "Staff");
    const reason = parseOptionalString(formData.get("reason"));

    const staff = await prisma.staff.findFirst({
      where: { id: staffId, organizationId },
    });
    if (!staff) {
      throw new Error("Staff member not found.");
    }
    if (!staff.locationId) {
      throw new Error("Staff member has no assigned location.");
    }

    const startsAt = parseLocalDateTime(
      parseRequiredString(formData.get("startDate"), "Start date"),
      parseRequiredString(formData.get("startTime"), "Start time"),
    );
    const endsAt = parseLocalDateTime(
      parseRequiredString(formData.get("endDate"), "End date"),
      parseRequiredString(formData.get("endTime"), "End time"),
    );

    if (endsAt <= startsAt) {
      throw new Error("End must be after start.");
    }

    await prisma.timeOff.create({
      data: {
        organizationId,
        locationId: staff.locationId,
        staffId,
        startsAt,
        endsAt,
        reason,
      },
    });
  } catch (error) {
    return actionError(error);
  }

  revalidateSchedulePaths(staffId);
  redirect(schedulePath(staffId));
}

export async function deleteTimeOff(formData: FormData): Promise<void> {
  const { organizationId } = await requireActiveOrgAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const staffId = String(formData.get("staffId") ?? "").trim();

  if (!id || !staffId) {
    redirect("/dashboard/admin/staff");
  }

  const row = await prisma.timeOff.findFirst({
    where: { id, staffId, organizationId },
  });
  if (!row) {
    redirect(schedulePath(staffId));
  }

  await prisma.timeOff.delete({ where: { id } });

  revalidateSchedulePaths(staffId);
  redirect(schedulePath(staffId));
}
