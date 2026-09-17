import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { generateTempPassword, otpExpiresAt } from "@/lib/onboarding";
import { buildStudentEmail, qualifiedUsername } from "@/lib/student-auth";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z
  .object({
    role: z.enum(["teacher", "parent", "student"]),
    full_name: z.string().trim().min(1, "Full name is required"),
    email: z.string().trim().toLowerCase().email("A valid email is required").optional(),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-zA-Z0-9_-]+$/, "Usernames may only contain letters, numbers, _ and -")
      .optional(),
    phone: z.string().trim().optional(),
    /** teacher → bio, parent → relation, student → date_of_birth */
    bio: z.string().trim().optional(),
    relation: z.string().trim().optional(),
    date_of_birth: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role === "student" && !v.username) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A username is required", path: ["username"] });
    }
    if (v.role !== "student" && !v.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "An email is required", path: ["email"] });
    }
  });

type CreateBody = z.infer<typeof createSchema>;

/**
 * Create a teacher, parent or student **account** — the API counterpart of
 * the web's `createPersonAccount` in `admin/onboarding.ts`.
 *
 * Returns the generated temporary password exactly once; the caller displays
 * it and the admin passes it to the user in person. The password is never
 * persisted in plaintext, and the flow records an OTP issue so the user gets
 * a reset flow if they miss the handover.
 *
 * On partial failure the created auth user, membership and profile are rolled
 * back so no orphan rows remain.
 */
export async function POST(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const parsed = await parseJson(request, createSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as CreateBody;

  // Students log in with a username; teachers and parents use email.
  const isStudent = body.role === "student";
  const username = isStudent ? body.username! : null;
  const extra =
    body.role === "teacher"
      ? body.bio ?? null
      : body.role === "parent"
        ? body.relation ?? null
        : (body.date_of_birth ?? null);

  const admin = createSupabaseAdmin();

  if (isStudent) {
    // Same plan gate as the web form: no silent over-limit signups.
    const [{ count }, { data: sub }] = await Promise.all([
      admin
        .from("student_profiles")
        .select("id", { count: "exact", head: true })
        .eq("mosque_id", ctx.mosqueId),
      admin
        .from("mosque_subscriptions")
        .select("plans(max_students)")
        .eq("mosque_id", ctx.mosqueId)
        .maybeSingle(),
    ]);
    const maxStudents = (sub?.plans as { max_students: number | null } | null)?.max_students ?? null;
    if (maxStudents !== null && (count ?? 0) >= maxStudents) {
      return err("The student limit for your plan has been reached.", 400, "student_limit_reached");
    }
  }

  // For students, derive a fake internal email from username + mosque slug.
  let authEmail: string;
  let loginId: string | null = null;
  if (isStudent) {
    const { data: mosque } = await admin
      .from("mosques")
      .select("slug")
      .eq("id", ctx.mosqueId)
      .single();
    if (!mosque) return err("Mosque not found.", 404, "mosque_not_found");
    authEmail = buildStudentEmail(username!, mosque.slug);
    // What the admin reads out: the qualified form works everywhere incl. mobile.
    loginId = qualifiedUsername(username!, mosque.slug);
  } else {
    authEmail = body.email!;
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: authEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: body.full_name, display_name: body.full_name },
  });
  if (createErr || !created.user) {
    return err(createErr?.message ?? "Failed to create the account.", 400, "user_creation_failed");
  }
  const newUserId = created.user.id;

  await admin
    .from("profiles")
    .update({
      must_rotate_password: true,
      phone: body.phone?.trim() ? body.phone.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", newUserId);

  // Students hold NO memberships row — app.is_member() must stay false for
  // them (standing invariant, see test_rls_student.sql). Their access comes
  // from student_profiles alone. Teachers and parents get a membership.
  if (!isStudent) {
    const { error: membershipErr } = await admin.from("memberships").insert({
      user_id: newUserId,
      mosque_id: ctx.mosqueId,
      role: body.role,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    if (membershipErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return dbErr(membershipErr.message);
    }
  }

  let profileInsertError: { message: string } | null = null;
  if (body.role === "teacher") {
    const { error } = await admin.from("teacher_profiles").insert({
      mosque_id: ctx.mosqueId,
      profile_id: newUserId,
      bio: extra,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    if (error) profileInsertError = error;
  } else if (body.role === "parent") {
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
      full_name: body.full_name,
      username,
      date_of_birth: extra ?? null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
    if (error) profileInsertError = error;
  }

  if (profileInsertError) {
    // Roll back membership and auth user to avoid orphans.
    await admin.from("memberships").delete().eq("user_id", newUserId);
    await admin.auth.admin.deleteUser(newUserId);
    return dbErr(profileInsertError.message);
  }

  const expires_at = otpExpiresAt();
  await admin.from("otp_issues").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    issued_by: ctx.userId,
    expires_at,
    metadata: { role: body.role, email: authEmail },
  });
  await admin.from("password_reset_audit").insert({
    mosque_id: ctx.mosqueId,
    user_id: newUserId,
    actor_user_id: ctx.userId,
    event: "otp_issued",
    metadata: { role: body.role, email: authEmail, expires_at },
  });
  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: `${body.role}.account_created`,
    targetTable:
      body.role === "teacher"
        ? "teacher_profiles"
        : body.role === "parent"
          ? "parent_profiles"
          : "student_profiles",
    targetId: newUserId,
    metadata: isStudent ? { username: username! } : { email: authEmail },
  });

  return ok({
    email: authEmail,
    full_name: body.full_name,
    tempPassword,
    expires_at,
    ...(loginId ? { username: loginId } : {}),
  });
}
