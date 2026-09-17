import { NextRequest } from "next/server";

import {
  requireApiStudent,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, notFound, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * One group as its enrolled student sees it: the group itself, upcoming
 * lessons, published weekly summaries, and the teacher's progress notes about
 * this student (the parent-visible ones, mirroring the web group page).
 *
 * Everything here is already narrowed by RLS to what this student may read:
 * enrollment rows are their own, weekly notes are `is_published` and their
 * group's, progress notes are their own rows. Teachers and classmates are
 * deliberately absent — RLS has no student branch for those joins, so the
 * web sections they back render empty for students too.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupId } = await params;
  const ctx = await requireApiStudent(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: enrollment } = await supabase
    .from("group_enrollments")
    .select("id, groups(id, name, description, room)")
    .eq("student_profile_id", ctx.studentProfileId)
    .eq("group_id", groupId)
    .eq("is_active", true)
    .maybeSingle();

  if (!enrollment) return notFound();
  const group = enrollment.groups as {
    id: string;
    name: string;
    description: string | null;
    room: string | null;
  } | null;
  if (!group) return notFound();

  const today = new Date().toISOString().slice(0, 10);

  const sessionsQuery = supabase
    .from("teaching_sessions")
    .select("id, date, start_time, end_time, is_cancelled, notes")
    .eq("group_id", groupId)
    .eq("mosque_id", ctx.mosqueId)
    .gte("date", today)
    .order("date", { ascending: true });

  const weeklyQuery = supabase
    .from("teacher_weekly_notes")
    .select("id, week_start, body")
    .eq("group_id", groupId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_published", true)
    .order("week_start", { ascending: false });

  const notesQuery = supabase
    .from("progress_notes")
    .select("id, body, created_at, visible_to_parents")
    .eq("student_profile_id", ctx.studentProfileId)
    .eq("group_id", groupId)
    .eq("visible_to_parents", true)
    .order("created_at", { ascending: false });

  const [sessionsRes, weeklyRes, notesRes] = await Promise.all([
    sessionsQuery.limit(5),
    weeklyQuery.limit(4),
    notesQuery.limit(10),
  ]);

  if (sessionsRes.error || weeklyRes.error || notesRes.error) {
    const message =
      sessionsRes.error?.message ?? weeklyRes.error?.message ?? notesRes.error?.message;
    return dbErr(message);
  }

  return ok({
    group,
    sessions: sessionsRes.data ?? [],
    weekly: weeklyRes.data ?? [],
    notes: notesRes.data ?? [],
  });
}
