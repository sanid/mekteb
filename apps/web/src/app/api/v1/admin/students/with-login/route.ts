import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { generateTempPassword, otpExpiresAt } from "@/lib/onboarding";
import { parseJson } from "@/app/api/v1/helpers/validate";

const createStudentSchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  full_name: z.string().trim().min(1, "full_name is required"),
  date_of_birth: z.string().trim().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const parsed = await parseJson(request, createStudentSchema);
  if (!parsed.ok) return parsed.response;
  const { email, full_name, date_of_birth } = parsed.data;

  const admin = createSupabaseAdmin();
  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name, display_name: full_name },
  });
  if (createErr || !created.user) {
    return dbErr(createErr?.message);
  }
  const newUserId = created.user.id;

  await admin
    .from("profiles")
    .update({ must_rotate_password: true, updated_at: new Date().toISOString() })
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

  const { error: profileErr } = await admin.from("student_profiles").insert({
    mosque_id: ctx.mosqueId,
    profile_id: newUserId,
    full_name,
    date_of_birth,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return dbErr(profileErr.message);
  }

  const expires_at = otpExpiresAt();
  await admin.from("otp_issues").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    issued_by: ctx.userId,
    expires_at,
    metadata: { role: "student", email },
  });

  await admin.from("password_reset_audit").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    actor_user_id: ctx.userId,
    event: "otp_issued",
    metadata: { role: "student", email, expires_at },
  });

  await admin.from("audit_logs").insert({
    mosque_id: ctx.mosqueId,
    actor_user_id: ctx.userId,
    action: "student.account_created",
    target_table: "student_profiles",
    target_id: newUserId,
    metadata: { email },
  });

  return ok({ email, full_name, tempPassword, expires_at }, 201);
}
