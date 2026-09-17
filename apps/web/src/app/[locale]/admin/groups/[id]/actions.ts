"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { toLocalDateStr, dayOfWeekFromDateStr } from "@/lib/date-utils";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";

type AudienceChoice = "group" | "individual";

export async function enrollStudent(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const student_profile_id = String(formData.get("student_profile_id") ?? "");
  if (!student_profile_id) return await actionError("no_students_selected");

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("id", student_profile_id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!student) return await actionError("student_not_in_mosque");

  const { error } = await supabase.from("group_enrollments").insert({
    mosque_id: ctx.mosqueId,
    group_id: groupId,
    student_profile_id,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (error) return await dbActionErr(error.message, "enrollStudent");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "enrollment.created", targetTable: "group_enrollments", targetId: null,
    metadata: { group_id: groupId, student_profile_id },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function bulkEnrollStudents(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const ids = formData.getAll("student_profile_ids").map(String).filter(Boolean);
  if (ids.length === 0) return await actionError("select_at_least_one_student");

  const supabase = await createClient();
  const { data: validStudents } = await supabase
    .from("student_profiles")
    .select("id")
    .in("id", ids)
    .eq("mosque_id", ctx.mosqueId);
  const validIds = new Set((validStudents ?? []).map((s) => s.id));
  const safeIds = ids.filter((id) => validIds.has(id));
  if (safeIds.length === 0) return await actionError("students_none_valid_in_mosque");

  const { error } = await supabase.from("group_enrollments").insert(
    safeIds.map((student_profile_id) => ({
      mosque_id: ctx.mosqueId,
      group_id: groupId,
      student_profile_id,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })),
  );
  if (error) return await dbActionErr(error.message, "bulkEnrollStudents");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "enrollment.created.bulk", targetTable: "group_enrollments", targetId: null,
    metadata: { group_id: groupId, count: safeIds.length },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unenrollStudent(groupId: string, enrollmentId: string) {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("group_enrollments")
    .update({ is_active: false, ended_at: new Date().toISOString().slice(0, 10) })
    .eq("id", enrollmentId);
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "enrollment.ended", targetTable: "group_enrollments", targetId: enrollmentId,
    metadata: { group_id: groupId },
  });
  revalidatePath("/", "layout");
}

export async function assignTeacher(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const teacher_profile_id = String(formData.get("teacher_profile_id") ?? "");
  if (!teacher_profile_id) return await actionError("no_teacher_selected");

  const supabase = await createClient();
  const { error } = await supabase.from("teacher_group_links").insert({
    mosque_id: ctx.mosqueId,
    group_id: groupId,
    teacher_profile_id,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (error) return await dbActionErr(error.message, "assignTeacher");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "teacher_group_link.created", targetTable: "teacher_group_links", targetId: null,
    metadata: { group_id: groupId, teacher_profile_id },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function bulkAssignTeachers(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const ids = formData.getAll("teacher_profile_ids").map(String).filter(Boolean);
  if (ids.length === 0) return await actionError("select_at_least_one_teacher");

  const supabase = await createClient();
  const { error } = await supabase.from("teacher_group_links").insert(
    ids.map((teacher_profile_id) => ({
      mosque_id: ctx.mosqueId,
      group_id: groupId,
      teacher_profile_id,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })),
  );
  if (error) return await dbActionErr(error.message, "bulkAssignTeachers");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "teacher_group_link.created.bulk", targetTable: "teacher_group_links", targetId: null,
    metadata: { group_id: groupId, count: ids.length },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unassignTeacher(groupId: string, linkId: string) {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("teacher_group_links")
    .update({ is_active: false })
    .eq("id", linkId);
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "teacher_group_link.ended", targetTable: "teacher_group_links", targetId: linkId,
    metadata: { group_id: groupId },
  });
  revalidatePath("/", "layout");
}

export async function createHomework(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const lesson_id = String(formData.get("lesson_id") ?? "").trim() || null;
  const dueRaw = String(formData.get("due_date") ?? "").trim();
  const due_date = dueRaw === "" ? null : dueRaw;
  const audience = String(formData.get("audience") ?? "group") as AudienceChoice;
  const targets = formData.getAll("student_ids").map(String).filter(Boolean);

  if (!title) return await actionError("title_required");
  if (audience === "individual" && targets.length === 0)
    return await actionError("select_at_least_one_student");

  const supabase = await createClient();
  const { data: hw, error } = await supabase
    .from("homework_assignments")
    .insert({
      mosque_id: ctx.mosqueId,
      group_id: groupId,
      lesson_id,
      title,
      body,
      due_date,
      audience,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error || !hw) return { error: error?.message ?? "Failed to create homework" };

  if (audience === "individual") {
    const { error: targetsError } = await supabase
      .from("homework_targets")
      .insert(
        targets.map((student_profile_id) => ({
          mosque_id: ctx.mosqueId,
          homework_id: hw.id,
          student_profile_id,
          created_by: ctx.userId,
          updated_by: ctx.userId,
        })),
      );
    if (targetsError) return await dbActionErr(targetsError.message, "createHomework");
  }

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "homework.created", targetTable: "homework_assignments", targetId: hw.id,
    metadata: { group_id: groupId, audience, title },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleHomeworkPublished(homeworkId: string, currentValue: boolean): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("homework_assignments")
    .update({ is_published: !currentValue, updated_by: ctx.userId })
    .eq("id", homeworkId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "toggleHomeworkPublished");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: currentValue ? "homework.unpublished" : "homework.published",
    targetTable: "homework_assignments", targetId: homeworkId,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function archiveGroup(groupId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .update({ is_active: false, updated_by: ctx.userId, updated_at: new Date().toISOString() })
    .eq("id", groupId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "archiveGroup");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "group.archived", targetTable: "groups", targetId: groupId,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "deleteGroup");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "group.deleted", targetTable: "groups", targetId: groupId,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function upsertHifzProgress(
  groupId: string,
  studentProfileId: string,
  pagesMemorized: number,
  notes?: string,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (pagesMemorized < 0 || pagesMemorized > 604) return await actionError("pages_out_of_range");

  const supabase = await createClient();
  const { error } = await supabase
    .from("hifz_progress")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        group_id: groupId,
        student_profile_id: studentProfileId,
        pages_memorized: pagesMemorized,
        notes: notes ?? null,
        updated_by: ctx.userId,
        created_by: ctx.userId,
      },
      { onConflict: "student_profile_id,group_id" },
    );
  if (error) return await dbActionErr(error.message, "upsertHifzProgress");
  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "hifz.upserted", targetTable: "hifz_progress", targetId: null,
    metadata: { group_id: groupId, student_profile_id: studentProfileId, pages: pagesMemorized },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setAttendance(
  groupId: string,
  input: { date: string; studentId: string; status: "present" | "absent" | "late" | "excused" },
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!input.date || !input.studentId) return await actionError("missing_fields");

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("attendance_sessions")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        group_id: groupId,
        session_date: input.date,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "group_id,session_date" },
    )
    .select("id")
    .single();
  if (sessionError || !session) return { error: sessionError?.message ?? "Failed to save session" };

  const { error: recordError } = await supabase
    .from("attendance_records")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        session_id: session.id,
        student_profile_id: input.studentId,
        status: input.status,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "session_id,student_profile_id" },
    );
  if (recordError) return await dbActionErr(recordError.message, "setAttendance");

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "attendance.recorded", targetTable: "attendance_records", targetId: null,
    metadata: { session_id: session.id, student_profile_id: input.studentId, status: input.status, date: input.date },
  });

  revalidatePath(`/[locale]/admin/groups/${groupId}`, "page");
  return { ok: true };
}

export async function takeAttendance(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const dateRaw = String(formData.get("session_date") ?? "").trim();
  if (!dateRaw) return await actionError("date_required");
  const session_date = dateRaw;

  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .upsert(
      {
        mosque_id: ctx.mosqueId,
        group_id: groupId,
        session_date,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "group_id,session_date" },
    )
    .select("id")
    .single();
  if (error || !session) return { error: error?.message ?? "Failed to save session" };

  const records: Array<{
    mosque_id: string;
    session_id: string;
    student_profile_id: string;
    status: "present" | "absent" | "late" | "excused";
    created_by: string;
    updated_by: string;
  }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("status_")) continue;
    const student_profile_id = key.slice("status_".length);
    const status = String(value) as "present" | "absent" | "late" | "excused";
    records.push({
      mosque_id: ctx.mosqueId,
      session_id: session.id,
      student_profile_id,
      status,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
  }

  if (records.length > 0) {
    const { error: recordsError } = await supabase
      .from("attendance_records")
      .upsert(records, { onConflict: "session_id,student_profile_id" });
    if (recordsError) return await dbActionErr(recordsError.message, "takeAttendance");
  }

  await writeAuditLog({
    mosqueId: ctx.mosqueId, actorUserId: ctx.userId,
    action: "attendance.recorded.batch", targetTable: "attendance_records", targetId: session.id,
    metadata: { session_date, count: records.length },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateGroupDetails(
  groupId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const room = String(formData.get("room") ?? "").trim() || null;

  // Schedule fields (optional — present from /admin/groups/[id] detail page)
  const weekdaysRaw = formData.getAll("weekdays").map(String).filter(Boolean);
  const weekdays = Array.from(
    new Set(
      weekdaysRaw
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
    ),
  );
  const startTimeRaw = String(formData.get("start_time") ?? "").trim();
  const endTimeRaw = String(formData.get("end_time") ?? "").trim();
  const hasScheduleFields = formData.has("start_time") || formData.has("end_time") || formData.has("weekdays");
  const startTime = startTimeRaw ? (startTimeRaw.length === 5 ? `${startTimeRaw}:00` : startTimeRaw) : "10:00:00";
  const endTime = endTimeRaw ? (endTimeRaw.length === 5 ? `${endTimeRaw}:00` : endTimeRaw) : "12:00:00";

  if (!name) return await actionError("name_required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .update({
      name,
      description,
      category_id: categoryId,
      room,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "updateGroupDetails");

  if (hasScheduleFields) {
    // Replace schedule rows for this group
    const { error: delErr } = await supabase
      .from("teaching_schedules")
      .delete()
      .eq("group_id", groupId);
    if (delErr) return await dbActionErr(delErr.message, "updateGroupDetails");

    if (weekdays.length > 0) {
      const { error: insErr } = await supabase
        .from("teaching_schedules")
        .insert(weekdays.map((d) => ({
          mosque_id: ctx.mosqueId,
          group_id: groupId,
          category_id: null,
          day_of_week: d,
          start_time: startTime,
          end_time: endTime,
        })));
      if (insErr) return await dbActionErr(insErr.message, "updateGroupDetails");
    }

    const regenErr = await regenerateGroupSessions(groupId, ctx.mosqueId);
    if (regenErr) return { error: regenErr };
  }

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "group.updated",
    targetTable: "groups",
    targetId: groupId,
    metadata: { name, description, category_id: categoryId, weekdays: weekdays.join(","), start_time: startTime, end_time: endTime },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setGroupSchedule(
  groupId: string,
  weekdays: number[],
  startTime: string,
  endTime: string,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  // Verify group belongs to mosque
  const { data: group, error: gErr } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (gErr) return await dbActionErr(gErr.message, "setGroupSchedule");
  if (!group) return await actionError("group_not_found");

  const cleanWeekdays = Array.from(
    new Set(
      (weekdays ?? [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
    ),
  );
  const start = startTime.length === 5 ? `${startTime}:00` : startTime;
  const end = endTime.length === 5 ? `${endTime}:00` : endTime;

  const { error: delErr } = await supabase
    .from("teaching_schedules")
    .delete()
    .eq("group_id", groupId);
  if (delErr) return await dbActionErr(delErr.message, "setGroupSchedule");

  if (cleanWeekdays.length > 0) {
    const { error: insErr } = await supabase
      .from("teaching_schedules")
      .insert(cleanWeekdays.map((d) => ({
        mosque_id: ctx.mosqueId,
        group_id: groupId,
        category_id: null,
        day_of_week: d,
        start_time: start,
        end_time: end,
      })));
    if (insErr) return await dbActionErr(insErr.message, "setGroupSchedule");
  }

  const regenErr = await regenerateGroupSessions(groupId, ctx.mosqueId);
  if (regenErr) return { error: regenErr };

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "group.schedule_updated",
    targetTable: "groups",
    targetId: groupId,
    metadata: { weekdays: cleanWeekdays.join(","), start_time: start, end_time: end },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

async function regenerateGroupSessions(
  groupId: string,
  mosqueId: string,
): Promise<string | null> {
  const supabase = await createClient();

  // Read this group's schedule rows
  const { data: schedRows, error: schedErr } = await supabase
    .from("teaching_schedules")
    .select("day_of_week, start_time, end_time")
    .eq("group_id", groupId);
  if (schedErr) return schedErr.message;

  // Read mosque school_year_start
  const { data: mosque } = await supabase
    .from("mosques")
    .select("school_year_start")
    .eq("id", mosqueId)
    .maybeSingle();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toLocalDateStr(today);

  const syStart = mosque?.school_year_start ? new Date(mosque.school_year_start) : null;
  const from = syStart && syStart > today ? syStart : today;
  const to = syStart
    ? new Date(syStart.getFullYear(), syStart.getMonth() + 13, syStart.getDate())
    : new Date(today.getFullYear(), today.getMonth() + 12, today.getDate());

  const activeDays = new Set((schedRows ?? []).map((r) => r.day_of_week));

  if (activeDays.size > 0) {
    type Row = {
      mosque_id: string;
      group_id: string;
      category_id: null;
      date: string;
      start_time: string;
      end_time: string;
    };
    const rows: Row[] = [];
    const byDay = new Map<number, { start_time: string; end_time: string }>();
    for (const r of schedRows ?? []) {
      byDay.set(r.day_of_week, { start_time: r.start_time, end_time: r.end_time });
    }
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      const cfg = byDay.get(dow);
      if (!cfg) continue;
      rows.push({
        mosque_id: mosqueId,
        group_id: groupId,
        category_id: null,
        date: toLocalDateStr(d),
        start_time: cfg.start_time,
        end_time: cfg.end_time,
      });
    }
    if (rows.length > 0) {
      // Compute delta against existing rows ourselves — partial unique indexes
      // can't be used as ON CONFLICT targets via PostgREST, so we avoid upsert.
      const { data: existingRows, error: exErr } = await supabase
        .from("teaching_sessions")
        .select("id, date, start_time, end_time, is_cancelled")
        .eq("group_id", groupId)
        .gte("date", rows[0].date)
        .lte("date", rows[rows.length - 1].date);
      if (exErr) return exErr.message;
      const existingByDate = new Map((existingRows ?? []).map((r) => [r.date, r]));
      const newRows = rows.filter((r) => !existingByDate.has(r.date));
      if (newRows.length > 0) {
        const { error: insErr } = await supabase
          .from("teaching_sessions")
          .insert(newRows);
        if (insErr) return insErr.message;
      }

      // Update times on existing, non-cancelled sessions whose schedule changed
      for (const r of rows) {
        const existing = existingByDate.get(r.date);
        if (!existing || existing.is_cancelled) continue;
        if (existing.start_time === r.start_time && existing.end_time === r.end_time) continue;
        const { error: updErr } = await supabase
          .from("teaching_sessions")
          .update({ start_time: r.start_time, end_time: r.end_time })
          .eq("id", existing.id);
        if (updErr) return updErr.message;
      }
    }
  }

  // Delete future non-cancelled sessions on weekdays we no longer teach
  const { data: futureRows, error: futErr } = await supabase
    .from("teaching_sessions")
    .select("id, date, is_cancelled")
    .eq("group_id", groupId)
    .gte("date", todayStr);
  if (futErr) return futErr.message;
  const toDelete = (futureRows ?? [])
    .filter((r) => !r.is_cancelled && !activeDays.has(dayOfWeekFromDateStr(r.date)))
    .map((r) => r.id);
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("teaching_sessions")
      .delete()
      .in("id", toDelete);
    if (delErr) return delErr.message;
  }
  return null;
}
