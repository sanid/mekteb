import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { generateTempPassword, otpExpiresAt } from "@/lib/onboarding";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { id: studentId } = await params;
  const supabase = await createSupabaseForUser(request);

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, full_name, profile_id")
    .eq("id", studentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!student) return err("Student not found.");
  if (!student.profile_id) return err("No login account linked to this student.");

  const admin = createSupabaseAdmin();
  const tempPassword = generateTempPassword();

  const { error: pwErr } = await admin.auth.admin.updateUserById(
    student.profile_id,
    { password: tempPassword },
  );
  if (pwErr) return dbErr(pwErr.message);

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

  return ok({ tempPassword, expires_at });
}
