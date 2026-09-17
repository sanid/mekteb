import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized, notFound } from "@/app/api/v1/helpers/response";

/**
 * The two candidate lists the admin group editor needs: students not yet
 * enrolled in the group, and teachers not yet assigned. The web page computes
 * these by loading the whole directory and filtering client-side; the phone
 * gets the filtered sets directly so it can show a bounded picker.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { id } = await params;
  const supabase = await createSupabaseForUser(request);

  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .select("id")
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (groupErr) return dbErr(groupErr.message);
  if (!group) return notFound("Group not found");

  const [{ data: enrollments }, { data: teacherLinks }] = await Promise.all([
    supabase
      .from("group_enrollments")
      .select("student_profile_id")
      .eq("group_id", id)
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true),
    supabase
      .from("teacher_group_links")
      .select("teacher_profile_id")
      .eq("group_id", id)
      .eq("mosque_id", ctx.mosqueId),
  ]);

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.student_profile_id));
  const assignedIds = new Set((teacherLinks ?? []).map((t) => t.teacher_profile_id));

  const [{ data: students }, { data: teachers }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("teacher_profiles")
      .select("id, profiles(full_name, display_name)")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true)
      .order("created_at"),
  ]);

  const teacherName = (t: {
    profiles: { display_name: string | null; full_name: string | null } | null;
  }) => t.profiles?.display_name ?? t.profiles?.full_name ?? "";

  return ok({
    students: (students ?? [])
      .filter((s) => !enrolledIds.has(s.id))
      .map((s) => ({ id: s.id, full_name: s.full_name })),
    teachers: (teachers ?? [])
      .filter((t) => !assignedIds.has(t.id))
      .map((t) => ({ id: t.id, name: teacherName(t) }))
      .filter((t) => t.name.length > 0),
  });
}
