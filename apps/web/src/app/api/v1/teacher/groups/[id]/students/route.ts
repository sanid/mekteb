import { NextRequest } from "next/server";

import {
  requireApiTeacher,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { generateTempPassword, otpExpiresAt } from "@/lib/onboarding";

async function assertTeacherOfGroup(
  supabase: Awaited<ReturnType<typeof createSupabaseForUser>>,
  teacherProfileId: string,
  groupId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("teacher_group_links")
    .select("id")
    .eq("teacher_profile_id", teacherProfileId)
    .eq("group_id", groupId)
    .eq("is_active", true)
    .maybeSingle();
  return Boolean(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupId } = await params;
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  if (
    !(await assertTeacherOfGroup(supabase, ctx.teacherProfileId, groupId))
  ) {
    return err("Not authorized for this group", 403);
  }

  const body = await request.json();
  const { full_name, email, date_of_birth } = body as {
    full_name?: string;
    email?: string;
    date_of_birth?: string;
  };

  if (!full_name?.trim() || !email?.trim())
    return err("Full name and email are required");

  const normalizedEmail = email.trim().toLowerCase();
  const admin = createSupabaseAdmin();
  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: full_name.trim(),
      display_name: full_name.trim(),
    },
  });
  if (createErr || !created.user)
    return dbErr(createErr?.message);

  const newUserId = created.user.id;

  await admin
    .from("profiles")
    .update({
      must_rotate_password: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", newUserId);

  const { error: membershipErr } = await admin.from("memberships").insert({
    user_id: newUserId,
    mosque_id: ctx.mosqueId,
    role: "student",
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (membershipErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return dbErr(membershipErr.message);
  }

  const { data: studentProfile, error: profileErr } = await admin
    .from("student_profiles")
    .insert({
      mosque_id: ctx.mosqueId,
      profile_id: newUserId,
      full_name: full_name.trim(),
      date_of_birth: date_of_birth?.trim() || null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();
  if (profileErr || !studentProfile) {
    await admin.auth.admin.deleteUser(newUserId);
    return dbErr(profileErr?.message);
  }

  const { error: enrollErr } = await admin.from("group_enrollments").insert({
    mosque_id: ctx.mosqueId,
    group_id: groupId,
    student_profile_id: studentProfile.id,
    is_active: true,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (enrollErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return dbErr(enrollErr.message);
  }

  const expires_at = otpExpiresAt();
  await admin.from("otp_issues").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    issued_by: ctx.userId,
    expires_at,
    metadata: { role: "student", email: normalizedEmail },
  });
  await admin.from("password_reset_audit").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    actor_user_id: ctx.userId,
    event: "otp_issued",
    metadata: { role: "student", email: normalizedEmail, expires_at },
  });
  await admin.from("audit_logs").insert({
    mosque_id: ctx.mosqueId,
    actor_user_id: ctx.userId,
    action: "student.account_created",
    target_table: "student_profiles",
    target_id: studentProfile.id,
    metadata: { email: normalizedEmail, group_id: groupId },
  });

  return ok(
    {
      email: normalizedEmail,
      full_name: full_name.trim(),
      tempPassword,
      expires_at,
      student_profile_id: studentProfile.id,
    },
    201,
  );
}
