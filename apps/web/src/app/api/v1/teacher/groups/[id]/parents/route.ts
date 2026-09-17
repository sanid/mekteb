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
  const {
    full_name,
    email,
    phone,
    relation,
    student_profile_id,
  } = body as {
    full_name?: string;
    email?: string;
    phone?: string;
    relation?: string;
    student_profile_id?: string;
  };

  if (!full_name?.trim() || !email?.trim())
    return err("Full name and email are required");
  if (!student_profile_id)
    return err("student_profile_id is required");

  const normalizedEmail = email.trim().toLowerCase();

  const { data: enrollment } = await supabase
    .from("group_enrollments")
    .select("id")
    .eq("group_id", groupId)
    .eq("student_profile_id", student_profile_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!enrollment)
    return err("Student is not enrolled in this group");

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
      phone: phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", newUserId);

  const { error: membershipErr } = await admin.from("memberships").insert({
    user_id: newUserId,
    mosque_id: ctx.mosqueId,
    role: "parent",
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (membershipErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return dbErr(membershipErr.message);
  }

  const { data: parentProfile, error: profileErr } = await admin
    .from("parent_profiles")
    .insert({
      mosque_id: ctx.mosqueId,
      profile_id: newUserId,
      relation: relation?.trim() || null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();
  if (profileErr || !parentProfile) {
    await admin.auth.admin.deleteUser(newUserId);
    return dbErr(profileErr?.message);
  }

  const { error: linkErr } = await admin.from("parent_student_links").insert({
    mosque_id: ctx.mosqueId,
    parent_profile_id: parentProfile.id,
    student_profile_id,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (linkErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return dbErr(linkErr.message);
  }

  const expires_at = otpExpiresAt();
  await admin.from("otp_issues").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    issued_by: ctx.userId,
    expires_at,
    metadata: { role: "parent", email: normalizedEmail },
  });
  await admin.from("password_reset_audit").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    actor_user_id: ctx.userId,
    event: "otp_issued",
    metadata: { role: "parent", email: normalizedEmail, expires_at },
  });
  await admin.from("audit_logs").insert({
    mosque_id: ctx.mosqueId,
    actor_user_id: ctx.userId,
    action: "parent.account_created",
    target_table: "parent_profiles",
    target_id: parentProfile.id,
    metadata: { email: normalizedEmail, student_profile_id, group_id: groupId },
  });

  return ok(
    {
      email: normalizedEmail,
      full_name: full_name.trim(),
      tempPassword,
      expires_at,
      parent_profile_id: parentProfile.id,
    },
    201,
  );
}
