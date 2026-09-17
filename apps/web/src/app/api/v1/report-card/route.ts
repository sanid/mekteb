import { NextRequest } from "next/server";

import {
  requireApiMember,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import {
  okNoStore,
  unauthorized,
  notFound,
  forbidden,
} from "@/app/api/v1/helpers/response";
import { parseQuery } from "@/app/api/v1/helpers/validate";
import { z } from "zod";

const querySchema = z.object({
  /** A parent asking for one of their children's reports. */
  studentId: z.string().uuid().optional(),
});

/**
 * A student's (or parent-of-student's) report card, computed on demand the
 * same way the web `/admin/report` page computes it: attendance since the
 * school-year start, hifz pages, passed/failed exams and lesson completions
 * against the mosque's lesson count. The web side is admin-only; here the
 * subject themselves (or their parent) may read it, gated on the
 * `annual_report` plugin.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { studentId } = parsed.data;

  const admin = createSupabaseAdmin();

  // Resolve the target student.
  let targetStudentId: string;
  let isParentView = false;
  if (studentId) {
    // Parent view: the caller must be linked to the student.
    const { data: parentProfiles } = await admin
      .from("parent_profiles")
      .select("id")
      .eq("profile_id", ctx.userId)
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true)
      .limit(1);
    if (!parentProfiles?.length) return forbidden("Only a linked parent may read this.");
    const { data: link } = await admin
      .from("parent_student_links")
      .select("id")
      .eq("parent_profile_id", parentProfiles[0].id)
      .eq("student_profile_id", studentId)
      .maybeSingle();
    if (!link) return forbidden("Only a linked parent may read this.");
    targetStudentId = studentId;
    isParentView = true;
  } else {
    // Student view: the caller must BE the student.
    const { data: sp } = await admin
      .from("student_profiles")
      .select("id")
      .eq("profile_id", ctx.userId)
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true)
      .maybeSingle();
    if (!sp) return forbidden("No student profile is linked to this account.");
    targetStudentId = sp.id;
  }

  // Plugin gate — mirrors the web report page's `requirePlugin`.
  const { data: pluginRow } = await admin
    .from("mosque_plugins")
    .select("plugin_id")
    .eq("mosque_id", ctx.mosqueId)
    .eq("plugin_id", "annual_report")
    .eq("is_active", true)
    .maybeSingle();
  if (!pluginRow) return notFound("This feature is not enabled for your mosque.");

  const { data: mosque } = await admin
    .from("mosques")
    .select("name, school_year_start")
    .eq("id", ctx.mosqueId)
    .single();
  const since = mosque?.school_year_start ?? new Date().toISOString().slice(0, 10);

  const { data: student } = await admin
    .from("student_profiles")
    .select("full_name")
    .eq("id", targetStudentId)
    .maybeSingle();
  if (!student) return notFound("Student not found");

  const [{ data: enrollments }, { data: attendance }, { data: hifz }, { data: exams }, { data: completions }, { data: lessons }] =
    await Promise.all([
      admin
        .from("group_enrollments")
        .select("groups(name)")
        .eq("student_profile_id", targetStudentId)
        .eq("is_active", true),
      admin
        .from("attendance_records")
        .select("status, attendance_sessions!inner(session_date, mosque_id)")
        .eq("student_profile_id", targetStudentId)
        .eq("attendance_sessions.mosque_id", ctx.mosqueId)
        .gte("attendance_sessions.session_date", since),
      admin
        .from("hifz_progress")
        .select("pages_memorized, groups(name)")
        .eq("student_profile_id", targetStudentId),
      admin
        .from("exam_sessions")
        .select("status")
        .eq("student_profile_id", targetStudentId)
        .in("status", ["passed", "failed"]),
      admin
        .from("lesson_completions")
        .select("id")
        .eq("student_profile_id", targetStudentId)
        .gte("created_at", since),
      admin
        .from("lessons")
        .select("id")
        .eq("mosque_id", ctx.mosqueId),
    ]);

  const att = attendance ?? [];
  const present = att.filter((r) => r.status === "present" || r.status === "late").length;
  const total = att.length;
  const examRows = exams ?? [];

  return okNoStore({
    studentName: student.full_name,
    since,
    isParentView,
    groups: (enrollments ?? [])
      .map((e) => (e.groups as { name: string } | null)?.name)
      .filter((n): n is string => Boolean(n)),
    attendancePresent: present,
    attendanceTotal: total,
    attendanceRate: total > 0 ? Math.round((present / total) * 100) : null,
    hifz: (hifz ?? []).map((h) => ({
      groupName: (h.groups as { name: string } | null)?.name ?? "",
      pages: h.pages_memorized,
    })),
    examsPassed: examRows.filter((e) => e.status === "passed").length,
    examsFailed: examRows.filter((e) => e.status === "failed").length,
    lessonsCompleted: (completions ?? []).length,
    totalLessons: (lessons ?? []).length,
  });
}
