"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";


export async function updateTeacherProfile(
  teacherId: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const display_name = String(formData.get("display_name") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;

  if (!full_name) return await actionError("full_name_required");

  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("id, profile_id")
    .eq("id", teacherId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!teacher) return await actionError("teacher_not_found");

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      full_name,
      display_name,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", teacher.profile_id);

  if (profileErr) return await dbActionErr(profileErr.message, "updateTeacherProfile");

  const { error: teacherErr } = await supabase
    .from("teacher_profiles")
    .update({
      bio,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", teacherId);

  if (teacherErr) return await dbActionErr(teacherErr.message, "updateTeacherProfile");

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleExaminerRole(
  teacherId: string,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("id, profile_id")
    .eq("id", teacherId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!teacher) return await actionError("teacher_not_found");

  const { data: existing } = await supabase
    .from("memberships")
    .select("id, is_active")
    .eq("user_id", teacher.profile_id)
    .eq("mosque_id", ctx.mosqueId)
    .eq("role", "examiner")
    .maybeSingle();

  const admin = createAdminClient();

  if (existing) {
    const { error } = await admin
      .from("memberships")
      .delete()
      .eq("id", existing.id);
    if (error) return await dbActionErr(error.message, "toggleExaminerRole");
  } else {
    const { error } = await admin
      .from("memberships")
      .insert({
        user_id: teacher.profile_id,
        mosque_id: ctx.mosqueId,
        role: "examiner",
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });
    if (error) return await dbActionErr(error.message, "toggleExaminerRole");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleAssistantRole(
  teacherId: string,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("id, profile_id")
    .eq("id", teacherId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!teacher) return await actionError("teacher_not_found");

  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", teacher.profile_id)
    .eq("mosque_id", ctx.mosqueId)
    .eq("role", "assistant")
    .maybeSingle();

  const admin = createAdminClient();

  if (existing) {
    const { error } = await admin
      .from("memberships")
      .delete()
      .eq("id", existing.id);
    if (error) return await dbActionErr(error.message, "toggleAssistantRole");
  } else {
    const { error } = await admin
      .from("memberships")
      .insert({
        user_id: teacher.profile_id,
        mosque_id: ctx.mosqueId,
        role: "assistant",
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });
    if (error) return await dbActionErr(error.message, "toggleAssistantRole");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteTeacher(
  teacherId: string,
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("id, profile_id")
    .eq("id", teacherId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!teacher) return await actionError("teacher_not_found");

  const admin = createAdminClient();

  // Write erasure audit log before deleting (records won't exist after cascade).
  await admin.from("audit_logs").insert({
    mosque_id: ctx.mosqueId,
    actor_user_id: ctx.userId,
    action: "teacher.account_erased",
    target_table: "teacher_profiles",
    target_id: teacherId,
    metadata: { profile_id: teacher.profile_id },
  });

  // Deleting the auth user cascades: profiles → teacher_profiles + all linked data.
  await admin.auth.admin.deleteUser(teacher.profile_id);

  revalidatePath("/", "layout");
  return { ok: true };
}
