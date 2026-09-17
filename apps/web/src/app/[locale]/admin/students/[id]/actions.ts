"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { generateTempPassword, otpExpiresAt } from "@/lib/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dbActionErr } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";

export type ResetPasswordResult =
  | { ok: true; tempPassword: string }
  | { error: string };

export async function resetStudentPassword(
  studentId: string,
): Promise<ResetPasswordResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, full_name, profile_id")
    .eq("id", studentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!student) return await actionError("student_not_found");
  if (!student.profile_id) return await actionError("no_login_account_for_student");

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { error: pwErr } = await admin.auth.admin.updateUserById(
    student.profile_id,
    { password: tempPassword },
  );
  if (pwErr) return await dbActionErr(pwErr.message, "resetStudentPassword");

  await admin
    .from("profiles")
    .update({ must_rotate_password: true, updated_at: new Date().toISOString() })
    .eq("id", student.profile_id);

  await admin
    .from("otp_issues")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("user_id", student.profile_id)
    .eq("mosque_id", ctx.mosqueId)
    .eq("status", "pending");

  const expires_at = otpExpiresAt();
  await admin.from("otp_issues").insert({
    mosque_id: ctx.mosqueId,
    user_id: student.profile_id,
    issued_by: ctx.userId,
    expires_at,
    metadata: { role: "student" },
  });

  await admin.from("password_reset_audit").insert({
    mosque_id: ctx.mosqueId,
    user_id: student.profile_id,
    actor_user_id: ctx.userId,
    event: "otp_issued",
    metadata: { role: "student", expires_at },
  });

  revalidatePath("/", "layout");
  return { ok: true, tempPassword };
}

export async function deleteStudent(
  studentId: string,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, full_name, profile_id")
    .eq("id", studentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!student) return await actionError("student_not_found");

  const admin = createAdminClient();

  // Write erasure audit log before deleting (records won't exist after cascade).
  await admin.from("audit_logs").insert({
    mosque_id: ctx.mosqueId,
    actor_user_id: ctx.userId,
    action: "student.account_erased",
    target_table: "student_profiles",
    target_id: studentId,
    metadata: { full_name: student.full_name, profile_id: student.profile_id },
  });

  if (student.profile_id) {
    // Has a login account: delete auth user → cascades to profiles + student_profiles.
    await admin.auth.admin.deleteUser(student.profile_id);
  } else {
    // No login account: delete the student_profiles row directly.
    await admin
      .from("student_profiles")
      .delete()
      .eq("id", studentId)
      .eq("mosque_id", ctx.mosqueId);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export type LinkResult = { ok: true } | { error: string };

export async function linkParentToStudent(
  studentId: string,
  formData: FormData,
): Promise<LinkResult> {
  const ctx = await requireAdmin();
  const parentProfileId = String(formData.get("parent_profile_id") ?? "").trim();
  if (!parentProfileId) return await actionError("select_a_parent");

  const supabase = await createClient();

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("id", studentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!student) return await actionError("student_not_found");

  const { data: parent } = await supabase
    .from("parent_profiles")
    .select("id")
    .eq("id", parentProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!parent) return await actionError("parent_not_found");

  const { error } = await supabase.from("parent_student_links").insert({
    mosque_id: ctx.mosqueId,
    parent_profile_id: parentProfileId,
    student_profile_id: studentId,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });

  if (error) {
    if (error.code === "23505") return await actionError("already_linked");
    return await dbActionErr(error.message, "linkParentToStudent");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unlinkParentFromStudent(formData: FormData): Promise<{ ok: true } | null> {
  const ctx = await requireAdmin();
  const linkId = String(formData.get("link_id") ?? "").trim();
  if (!linkId) return null;

  const supabase = await createClient();
  await supabase
    .from("parent_student_links")
    .delete()
    .eq("id", linkId)
    .eq("mosque_id", ctx.mosqueId);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleLessonCompletion(
  studentId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireAdmin();
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const completed = formData.get("completed") === "true";
  if (!lessonId) return await actionError("lesson_id_missing");

  const supabase = await createClient();

  // The lesson must belong to the same mosque — a foreign lesson id would
  // otherwise pollute the completion list and skew the report card.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!lesson) return await actionError("lesson_not_in_mosque");

  if (completed) {
    await supabase.from("lesson_completions").upsert(
      {
        mosque_id: ctx.mosqueId,
        student_profile_id: studentId,
        lesson_id: lessonId,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "student_profile_id,lesson_id" },
    );
  } else {
    await supabase
      .from("lesson_completions")
      .delete()
      .eq("student_profile_id", studentId)
      .eq("lesson_id", lessonId)
      .eq("mosque_id", ctx.mosqueId);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
