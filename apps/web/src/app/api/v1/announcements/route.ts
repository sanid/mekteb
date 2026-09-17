import { NextRequest } from "next/server";

import {
  requireApiMember,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * Read-only announcements feed for any authenticated member. Returns published
 * announcements that target the caller's mosque or one of the caller's groups.
 * RLS still applies on top — this route narrows by group membership.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const [{ data: teacherLinks }, { data: enrollments }, { data: parentLinks }] =
    await Promise.all([
      supabase
        .from("teacher_group_links")
        .select("group_id, teacher_profiles!inner(profile_id)")
        .eq("teacher_profiles.profile_id", ctx.userId)
        .eq("is_active", true),
      supabase
        .from("group_enrollments")
        .select("group_id, student_profiles!inner(profile_id)")
        .eq("student_profiles.profile_id", ctx.userId)
        .eq("is_active", true),
      supabase
        .from("parent_student_links")
        .select(
          "student_profile_id, parent_profiles!inner(profile_id), student_profiles(id)",
        )
        .eq("parent_profiles.profile_id", ctx.userId),
    ]);

  const teacherGroupIds = ((teacherLinks ?? []) as Array<{ group_id: string }>)
    .map((l) => l.group_id);
  const studentGroupIds = ((enrollments ?? []) as Array<{ group_id: string }>)
    .map((e) => e.group_id);

  const parentStudentIds = ((parentLinks ?? []) as Array<{
    student_profile_id: string;
  }>).map((l) => l.student_profile_id);

  let parentGroupIds: string[] = [];
  if (parentStudentIds.length > 0) {
    const { data: parentEnroll } = await supabase
      .from("group_enrollments")
      .select("group_id")
      .in("student_profile_id", parentStudentIds)
      .eq("is_active", true);
    parentGroupIds = ((parentEnroll ?? []) as Array<{ group_id: string }>).map(
      (e) => e.group_id,
    );
  }

  const groupIds = Array.from(
    new Set([...teacherGroupIds, ...studentGroupIds, ...parentGroupIds]),
  );

  const baseQuery = supabase
    .from("announcements")
    .select("id, title, body, audience, group_id, published_at, created_at")
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(100);

  const { data, error } =
    groupIds.length > 0
      ? await baseQuery.or(
          `audience.eq.mosque,and(audience.eq.group,group_id.in.(${groupIds.join(",")}))`,
        )
      : await baseQuery.eq("audience", "mosque");

  if (error) return dbErr(error.message);
  return ok(data);
}
