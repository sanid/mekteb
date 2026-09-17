import { NextRequest } from "next/server";

import {
  requireApiStudent,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { requireApiPlugin } from "@/app/api/v1/helpers/plugins";

/**
 * Published weekly notes for the groups the student is actively enrolled in
 * (mirrors the web `/student/weekly-notes` page). Read-only; the RLS branch
 * added by `20260809110000_student_reads_weekly_notes` scopes it to the
 * student's own groups.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiStudent(request);
  if (!ctx) return unauthorized();

  const gate = await requireApiPlugin(request, ctx.mosqueId, "lesson_library");
  if (gate) return gate;

  const supabase = await createSupabaseForUser(request);

  const { data: enrollments } = await supabase
    .from("group_enrollments")
    .select("group_id")
    .eq("student_profile_id", ctx.studentProfileId)
    .eq("is_active", true);

  const groupIds = (enrollments ?? []).map((e) => e.group_id).filter(Boolean);

  const { data, error } =
    groupIds.length > 0
      ? await supabase
          .from("teacher_weekly_notes")
          .select("id, body, week_start, group_id, groups(name)")
          .eq("is_published", true)
          .in("group_id", groupIds)
          .order("week_start", { ascending: false })
          .limit(100)
      : { data: [], error: null };

  if (error) return dbErr(error.message);

  return ok({
    notes: (data ?? []).map((n) => ({
      id: n.id,
      body: n.body,
      weekStart: n.week_start,
      groupName: (n.groups as { name: string } | null)?.name ?? null,
    })),
  });
}
