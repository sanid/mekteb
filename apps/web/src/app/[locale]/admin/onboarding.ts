"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { generateTempPassword, otpExpiresAt } from "@/lib/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkStudentLimit } from "@/lib/student-limit";
import { buildStudentEmail, qualifiedUsername } from "@/lib/student-auth";
import { dbActionErr } from "@/lib/action-result";
import { actionErrorState } from "@/lib/action-errors";

export type OnboardingResult =
  | { ok: true; email: string; full_name: string; tempPassword: string; expires_at: string; username?: string }
  | { ok: false; error: string };

type Role = "teacher" | "parent" | "student";

/**
 * Create a teacher or parent account. Admin-only. Returns the generated
 * temporary password once — the caller displays it and the admin passes it
 * to the user in person. The password is NOT persisted in plaintext.
 *
 * This lives as a Next server action for now; when mobile clients arrive it
 * should move to a Supabase Edge Function with the same contract so that
 * non-web callers can hit it.
 */
async function createPersonAccount(
  role: Role,
  formData: FormData,
): Promise<OnboardingResult> {
  const ctx = await requireAdmin();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  // Students log in with a username; teachers and parents use email.
  const isStudent = role === "student";
  const username = isStudent
    ? String(formData.get("username") ?? "").trim().toLowerCase()
    : null;
  const email = isStudent
    ? null
    : String(formData.get("email") ?? "").trim().toLowerCase();

  // Extra field: teacher → bio, parent → relation, student → date_of_birth
  const extraKey =
    role === "teacher" ? "bio" : role === "parent" ? "relation" : "date_of_birth";
  const extra = String(formData.get(extraKey) ?? "").trim() || null;

  if (isStudent && !username) return await actionErrorState("username_required");
  if (isStudent && username && !/^[a-zA-Z0-9_-]+$/.test(username)) {
    return await actionErrorState("username_invalid_chars");
  }
  if (!isStudent && !email) return await actionErrorState("email_required");
  if (!full_name) return await actionErrorState("full_name_required");

  if (isStudent) {
    const limitError = await checkStudentLimit(ctx.mosqueId);
    if (limitError) return { ok: false, error: limitError };
  }

  const admin = createAdminClient();

  // For students, derive a fake internal email from username + mosque slug.
  let authEmail: string;
  let loginId: string | null = null;
  if (isStudent) {
    const { data: mosque } = await admin
      .from("mosques")
      .select("slug")
      .eq("id", ctx.mosqueId)
      .single();
    if (!mosque) return await actionErrorState("mosque_not_found");
    authEmail = buildStudentEmail(username!, mosque.slug);
    // What the admin reads out: the bare username only works on the
    // mosque subdomain, the qualified form works everywhere incl. mobile.
    loginId = qualifiedUsername(username!, mosque.slug);
  } else {
    authEmail = email!;
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: authEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name, display_name: full_name },
  });
  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? "Failed to create user." };
  }
  const newUserId = created.user.id;

  await admin
    .from("profiles")
    .update({ must_rotate_password: true, phone, updated_at: new Date().toISOString() })
    .eq("id", newUserId);

  // Students hold NO memberships row — app.is_member() must stay false for
  // them (standing invariant, see test_rls_student.sql). Their access comes
  // from student_profiles alone. Teachers and parents get a membership.
  if (!isStudent) {
    const { error: membershipErr } = await admin.from("memberships").insert({
      user_id: newUserId,
      mosque_id: ctx.mosqueId,
      role,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    if (membershipErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return { ok: false, ...await dbActionErr(membershipErr.message) };
    }
  }

  let profileInsertError: Error | null = null;
  if (role === "teacher") {
    const { error } = await admin.from("teacher_profiles").insert({
      mosque_id: ctx.mosqueId,
      profile_id: newUserId,
      bio: extra,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    if (error) profileInsertError = error;
  } else if (role === "parent") {
    const { error } = await admin.from("parent_profiles").insert({
      mosque_id: ctx.mosqueId,
      profile_id: newUserId,
      relation: extra,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    if (error) profileInsertError = error;
  } else {
    const { error } = await admin.from("student_profiles").insert({
      mosque_id: ctx.mosqueId,
      profile_id: newUserId,
      full_name,
      username,
      date_of_birth: extra ?? null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    if (error) profileInsertError = error;
  }

  if (profileInsertError) {
    // Clean up membership row and auth user to avoid orphans.
    await admin.from("memberships").delete().eq("user_id", newUserId);
    await admin.auth.admin.deleteUser(newUserId);
    return { ok: false, ...await dbActionErr(profileInsertError.message) };
  }

  const expires_at = otpExpiresAt();
  await admin.from("otp_issues").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    issued_by: ctx.userId,
    expires_at,
    metadata: { role, email: authEmail },
  });
  await admin.from("password_reset_audit").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    actor_user_id: ctx.userId,
    event: "otp_issued",
    metadata: { role, email: authEmail, expires_at },
  });
  await admin.from("audit_logs").insert({
    mosque_id: ctx.mosqueId,
    actor_user_id: ctx.userId,
    action: `${role}.account_created`,
    target_table: role === "teacher" ? "teacher_profiles" : role === "parent" ? "parent_profiles" : "student_profiles",
    target_id: newUserId,
    metadata: isStudent ? { username } : { email: authEmail },
  });

  revalidatePath("/", "layout");

  return { ok: true, email: authEmail, full_name, tempPassword, expires_at, ...(loginId ? { username: loginId } : {}) };
}

export async function createTeacherAccount(
  _prev: OnboardingResult | null,
  formData: FormData,
): Promise<OnboardingResult> {
  return createPersonAccount("teacher", formData);
}

export async function createParentAccount(
  _prev: OnboardingResult | null,
  formData: FormData,
): Promise<OnboardingResult> {
  return createPersonAccount("parent", formData);
}

export async function createStudentAccount(
  _prev: OnboardingResult | null,
  formData: FormData,
): Promise<OnboardingResult> {
  return createPersonAccount("student", formData);
}
