import { NextRequest } from "next/server";

import {
  requireApiTeacher,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, unauthorized, notFound, err } from "@/app/api/v1/helpers/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const { id } = await params;
  const supabase = await createSupabaseForUser(request);

  const { data: link } = await supabase
    .from("teacher_group_links")
    .select("id")
    .eq("teacher_profile_id", ctx.teacherProfileId)
    .eq("group_id", id)
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true)
    .maybeSingle();
  if (!link) return err("Not authorized for this group", 403);

  const { data, error } = await supabase
    .from("groups")
    .select("id, name, description, is_active, created_at, updated_at")
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId)
    .single();

  if (error || !data) return notFound("Group not found");

  const [{ data: enrollments }, { data: teacherLinks }] = await Promise.all([
    supabase
      .from("group_enrollments")
      .select("id, student_profile_id, enrolled_at, student_profiles(id, full_name)")
      .eq("group_id", id)
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true),
    supabase
      .from("teacher_group_links")
      .select("id, teacher_profile_id, teacher_profiles(id, profiles(full_name, display_name))")
      .eq("group_id", id)
      .eq("mosque_id", ctx.mosqueId),
  ]);

  const typedEnrollments = (enrollments ?? []) as unknown as Array<{
    id: string;
    student_profile_id: string;
    enrolled_at: string;
    student_profiles: { full_name: string } | null;
  }>;

  const typedTeacherLinks = (teacherLinks ?? []) as unknown as Array<{
    id: string;
    teacher_profile_id: string;
    teacher_profiles: {
      profiles: { display_name: string | null; full_name: string | null } | null;
    } | null;
  }>;

  return ok({
    ...data,
    enrollments: typedEnrollments.map((e) => ({
      id: e.id,
      studentProfileId: e.student_profile_id,
      studentName: e.student_profiles?.full_name ?? "",
      enrolledAt: e.enrolled_at,
    })),
    teacherLinks: typedTeacherLinks.map((t) => ({
      id: t.id,
      teacherProfileId: t.teacher_profile_id,
      teacherName:
        t.teacher_profiles?.profiles?.display_name ??
        t.teacher_profiles?.profiles?.full_name ??
        "",
    })),
  });
}
