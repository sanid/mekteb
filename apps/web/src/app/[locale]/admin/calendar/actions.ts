"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { getMosqueConfig } from "@/lib/mosque-config";
import { dbActionErr } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";

type WeeklyScheduleInput = {
  category_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

// Update a group-keyed teaching_session by id (cancel/uncancel/notes).
export async function updateGroupSession(
  sessionId: string,
  patch: { is_cancelled?: boolean; notes?: string | null },
) {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("teaching_sessions")
    .update({
      ...(patch.is_cancelled !== undefined ? { is_cancelled: patch.is_cancelled } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "updateGroupSession");
  revalidatePath("/", "layout");
  return { ok: true };
}

// legacy: category-level schedules. Per-group schedules are managed on /admin/groups/[id].
export async function saveWeeklySchedules(schedules: WeeklyScheduleInput[]) {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  // Delete only category-level schedules; group-level rows are managed elsewhere.
  const { error: deleteError } = await supabase
    .from("teaching_schedules")
    .delete()
    .eq("mosque_id", ctx.mosqueId)
    .is("group_id", null);

  if (deleteError) {
    return await dbActionErr(deleteError.message, "saveWeeklySchedules");
  }

  if (schedules.length > 0) {
    const { error: insertError } = await supabase
      .from("teaching_schedules")
      .insert(
        schedules.map((s) => ({
          mosque_id: ctx.mosqueId,
          category_id: s.category_id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        })),
      );

    if (insertError) {
      return await dbActionErr(insertError.message, "saveWeeklySchedules");
    }
  }

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "calendar.schedules_updated",
    targetTable: "teaching_schedules",
    targetId: null,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleOrSaveSession(
  date: string,
  categoryId: string,
  enabled: boolean,
  startTime: string,
  endTime: string,
  isCancelled: boolean,
  notes: string | null,
) {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  if (!enabled) {
    // Delete the session row
    const { error } = await supabase
      .from("teaching_sessions")
      .delete()
      .eq("mosque_id", ctx.mosqueId)
      .eq("date", date)
      .eq("category_id", categoryId);

    if (error) return await dbActionErr(error.message, "toggleOrSaveSession");
  } else {
    // Upsert the session row
    const { error } = await supabase
      .from("teaching_sessions")
      .upsert(
        {
          mosque_id: ctx.mosqueId,
          date,
          category_id: categoryId,
          start_time: startTime,
          end_time: endTime,
          is_cancelled: isCancelled,
          notes: notes?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "mosque_id,date,category_id" },
      );

    if (error) return await dbActionErr(error.message, "toggleOrSaveSession");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteSessionsForDates(dates: string[]) {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  if (dates.length === 0) return { ok: true, count: 0 };

  const { error } = await supabase
    .from("teaching_sessions")
    .delete()
    .eq("mosque_id", ctx.mosqueId)
    .in("date", dates);

  if (error) return await dbActionErr(error.message, "deleteSessionsForDates");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "calendar.sessions_bulk_deleted",
    targetTable: "teaching_sessions",
    targetId: null,
    metadata: { datesCount: dates.length },
  });

  revalidatePath("/", "layout");
  return { ok: true, count: dates.length };
}

export async function deleteSessionsDuringHolidays(year: number) {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const { state } = await getMosqueConfig(ctx.mosqueId);

  // Fetch holidays for this state and year
  const { data: holidays, error: holidayError } = await supabase
    .from("school_holidays")
    .select("start_date, end_date")
    .eq("state", state)
    .gte("start_date", `${year}-01-01`)
    .lte("end_date", `${year}-12-31`);

  if (holidayError) return await dbActionErr(holidayError.message, "deleteSessionsDuringHolidays");
  if (!holidays || holidays.length === 0) {
    return await actionError("no_holidays_configured");
  }

  // Delete sessions falling in holiday ranges
  let totalDeleted = 0;
  for (const h of holidays) {
    const { error: delError, count } = await supabase
      .from("teaching_sessions")
      .delete({ count: "exact" })
      .eq("mosque_id", ctx.mosqueId)
      .gte("date", h.start_date)
      .lte("date", h.end_date);

    if (delError) return await dbActionErr(delError.message, "deleteSessionsDuringHolidays");
    totalDeleted += count ?? 0;
  }

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "calendar.sessions_holiday_deleted",
    targetTable: "teaching_sessions",
    targetId: null,
    metadata: { year, totalDeleted },
  });

  revalidatePath("/", "layout");
  return { ok: true, count: totalDeleted };
}

export async function toggleOrSaveGroupSession(
  date: string,
  groupId: string,
  enabled: boolean,
  startTime: string,
  endTime: string,
  isCancelled: boolean,
  notes: string | null,
) {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  if (!enabled) {
    // Delete the session row
    const { error } = await supabase
      .from("teaching_sessions")
      .delete()
      .eq("mosque_id", ctx.mosqueId)
      .eq("date", date)
      .eq("group_id", groupId);

    if (error) return await dbActionErr(error.message, "toggleOrSaveGroupSession");
  } else {
    // Upsert the session row.
    // Check if session exists for this date and group
    const { data: existing, error: findError } = await supabase
      .from("teaching_sessions")
      .select("id")
      .eq("mosque_id", ctx.mosqueId)
      .eq("date", date)
      .eq("group_id", groupId)
      .maybeSingle();

    if (findError) return await dbActionErr(findError.message, "toggleOrSaveGroupSession");

    if (existing) {
      // Update
      const { error: updateError } = await supabase
        .from("teaching_sessions")
        .update({
          start_time: startTime,
          end_time: endTime,
          is_cancelled: isCancelled,
          notes: notes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateError) return await dbActionErr(updateError.message, "toggleOrSaveGroupSession");
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from("teaching_sessions")
        .insert({
          mosque_id: ctx.mosqueId,
          date,
          group_id: groupId,
          category_id: null,
          start_time: startTime,
          end_time: endTime,
          is_cancelled: isCancelled,
          notes: notes?.trim() || null,
          updated_at: new Date().toISOString(),
        });
      if (insertError) return await dbActionErr(insertError.message, "toggleOrSaveGroupSession");
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveCalendarEvent(event: {
  title: string;
  description?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  visibility: string;
}) {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("calendar_events")
    .insert({
      mosque_id: ctx.mosqueId,
      title: event.title.trim(),
      description: event.description?.trim() || null,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time,
      visibility: event.visibility,
    });

  if (error) return await dbActionErr(error.message, "saveCalendarEvent");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "calendar.event_created",
    targetTable: "calendar_events",
    targetId: null,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCalendarEvent(eventId: string) {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "deleteCalendarEvent");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "calendar.event_deleted",
    targetTable: "calendar_events",
    targetId: eventId,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
