import { NextRequest } from "next/server";

import {
  requireApiTeacher,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized, notFound } from "@/app/api/v1/helpers/response";

/**
 * One student's profile for a teacher: attendance history, progress notes,
 * homework, hifz and parent contacts — the mobile half of the web
 * `/teacher/students/[id]` page.
 *
 * Everything is scoped through RLS: the teacher's `teacher_group_links` gate
 * which groups, and from there the student, so a teacher can only ever read
 * students in groups they teach. Parent contacts flow through the teacher
 * branch added by `20260809120000_teacher_reads_parent_contacts`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const { id: studentProfileId } = await params;
  const supabase = await createSupabaseForUser(request);

  // The teacher's groups (RLS already scopes these to the caller).
  const { data: sharedEnrollments } = await supabase
    .from("teacher_group_links")
    .select("group_id, groups(id, name)")
    .eq("teacher_profile_id", ctx.teacherProfileId)
    .eq("is_active", true);

  const sharedGroupIds = (sharedEnrollments ?? []).map((l) => l.group_id);

  // The student must be enrolled (active) in one of those groups.
  const { data: enrollment } = await supabase
    .from("group_enrollments")
    .select("group_id")
    .eq("student_profile_id", studentProfileId)
    .in("group_id", sharedGroupIds)
    .eq("is_active", true)
    .maybeSingle();

  if (!enrollment) return notFound("Student not found.");

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, full_name, date_of_birth, is_active")
    .eq("id", studentProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!student) return notFound("Student not found.");

  // Groups this student is in, from the teacher's set (with hifz detection).
  const { data: studentGroups } = await supabase
    .from("group_enrollments")
    .select("group_id, groups(id, name, group_categories(is_hifz))")
    .eq("student_profile_id", studentProfileId)
    .in("group_id", sharedGroupIds)
    .eq("is_active", true);

  const groups = (studentGroups ?? []).map((e) => {
    const g = e.groups as {
      id: string;
      name: string;
      group_categories: { is_hifz: boolean } | null;
    } | null;
    return {
      id: g?.id ?? "",
      name: g?.name ?? "",
      isHifz: g?.group_categories?.is_hifz === true,
    };
  }).filter((g) => g.id);

  const hifzGroupIds = groups.filter((g) => g.isHifz).map((g) => g.id);

  const [
    { data: attendance },
    { data: progressNotes },
    { data: homework },
    { data: parentLinks },
    { data: hifzRows },
  ] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("id, status, attendance_sessions(session_date, groups(name))")
      .eq("student_profile_id", studentProfileId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("progress_notes")
      .select("id, body, visible_to_parents, created_at, groups(name)")
      .eq("student_profile_id", studentProfileId)
      .in("group_id", sharedGroupIds)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("homework_assignments")
      .select("id, title, due_date, group_id, groups(name)")
      .in("group_id", sharedGroupIds)
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_published", true)
      .order("due_date", { ascending: false })
      .limit(10),
    supabase
      .from("parent_student_links")
      .select(
        "parent_profile_id, parent_profiles(relation, profiles(full_name, display_name, phone))",
      )
      .eq("student_profile_id", studentProfileId),
    hifzGroupIds.length > 0
      ? supabase
          .from("hifz_progress")
          .select("pages_memorized, groups(name)")
          .eq("student_profile_id", studentProfileId)
          .in("group_id", hifzGroupIds)
      : Promise.resolve({ data: [] }),
  ]);

  if (attendance instanceof Object && "error" in attendance && attendance.error) {
    return dbErr((attendance as { error: { message: string } }).error.message);
  }

  return ok({
    student: {
      id: student.id,
      full_name: student.full_name,
      date_of_birth: student.date_of_birth,
      is_active: student.is_active,
    },
    groups,
    attendance: (attendance ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      sessionDate: (r.attendance_sessions as { session_date: string } | null)?.session_date ?? null,
      groupName: (r.attendance_sessions as { groups: { name: string } | null } | null)?.groups?.name ?? null,
    })),
    progressNotes: (progressNotes ?? []).map((n) => ({
      id: n.id,
      body: n.body,
      visibleToParents: n.visible_to_parents,
      createdAt: n.created_at,
      groupName: (n.groups as { name: string } | null)?.name ?? null,
    })),
    homework: (homework ?? []).map((h) => ({
      id: h.id,
      title: h.title,
      dueDate: h.due_date,
      groupName: (h.groups as { name: string } | null)?.name ?? null,
    })),
    parents: (parentLinks ?? []).map((l) => {
      const pp = l.parent_profiles as {
        relation: string | null;
        profiles: { full_name: string | null; display_name: string | null; phone: string | null } | null;
      } | null;
      return {
        name: pp?.profiles?.display_name ?? pp?.profiles?.full_name ?? null,
        relation: pp?.relation ?? null,
        phone: pp?.profiles?.phone ?? null,
      };
    }),
    hifz: (hifzRows ?? []).map((h) => ({
      pages: h.pages_memorized,
      groupName: (h.groups as { name: string } | null)?.name ?? null,
    })),
  });
}
