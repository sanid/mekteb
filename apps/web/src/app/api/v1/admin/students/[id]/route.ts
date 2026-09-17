import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, unauthorized, notFound } from "@/app/api/v1/helpers/response";
import { parseQuery } from "@/app/api/v1/helpers/validate";

const deleteQuerySchema = z.object({
  mode: z.enum(["soft", "hard"]).default("soft"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { id: studentId } = await params;
  const supabase = await createSupabaseForUser(request);

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, full_name, date_of_birth, is_active, notes, profile_id")
    .eq("id", studentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!student) return notFound("Student not found.");

  const [
    { data: enrollments },
    { data: parentLinks },
    { data: completions },
  ] = await Promise.all([
    supabase
      .from("group_enrollments")
      .select("id, groups(id, name)")
      .eq("student_profile_id", studentId)
      .eq("is_active", true),
    supabase
      .from("parent_student_links")
      .select("id, parent_profile_id, parent_profiles(id, relation, profiles(full_name, display_name))")
      .eq("student_profile_id", studentId)
      .eq("mosque_id", ctx.mosqueId),
    supabase
      .from("lesson_completions")
      .select("lesson_id")
      .eq("student_profile_id", studentId)
      .eq("mosque_id", ctx.mosqueId),
  ]);

  return ok({
    student,
    enrollments: enrollments ?? [],
    parentLinks: parentLinks ?? [],
    completions: (completions ?? []).map((c) => c.lesson_id),
  });
}

/**
 * Edit a student: name, date of birth, active flag. The mobile admin screen
 * needs this; the web admin used server actions for the same fields.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { id: studentId } = await params;

  let body: { full_name?: string; date_of_birth?: string | null; is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const full_name = (body.full_name ?? "").trim();
  if (!full_name) {
    return Response.json({ error: "Full name is required." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    full_name,
    updated_at: new Date().toISOString(),
    updated_by: ctx.userId,
  };
  if (body.date_of_birth !== undefined) {
    updates.date_of_birth = body.date_of_birth || null;
  }
  if (body.is_active !== undefined) {
    updates.is_active = !!body.is_active;
  }

  const supabase = createSupabaseForUser(request);

  // Only include the fields the caller actually sent.
  const updateValues = {
    full_name,
    updated_at: new Date().toISOString(),
    updated_by: ctx.userId,
    ...(body.date_of_birth !== undefined
      ? { date_of_birth: body.date_of_birth || null }
      : {}),
    ...(body.is_active !== undefined ? { is_active: !!body.is_active } : {}),
  };

  const { data: student, error } = await supabase
    .from("student_profiles")
    .update(updateValues)
    .eq("id", studentId)
    .eq("mosque_id", ctx.mosqueId)
    .select("id, full_name, is_active")
    .maybeSingle();

  if (error || !student) {
    return Response.json({ error: error?.message ?? "Student not found." }, { status: error ? 500 : 404 });
  }

  await supabase.from("audit_logs").insert({
    mosque_id: ctx.mosqueId,
    actor_user_id: ctx.userId,
    action: "student.updated",
    target_table: "student_profiles",
    target_id: studentId,
    metadata: { full_name, is_active: updateValues.is_active },
  });

  return ok({ id: student.id, full_name: student.full_name, is_active: student.is_active });
}

/**
 * Delete a student.
 *
 * - `?mode=soft` (default): flips `is_active=false`. Reversible; preserves
 *   attendance / homework history.
 * - `?mode=hard`: permanently deletes the auth user (if any) and the
 *   student row. Irreversible — require explicit opt-in.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const parsedQuery = parseQuery(request, deleteQuerySchema);
  if (!parsedQuery.ok) return parsedQuery.response;
  const { mode } = parsedQuery.data;

  const { id: studentId } = await params;
  const supabase = createSupabaseForUser(request);

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, full_name, profile_id")
    .eq("id", studentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!student) return notFound("Student not found.");

  const admin = createSupabaseAdmin();

  if (mode === "soft") {
    await admin
      .from("student_profiles")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      })
      .eq("id", studentId)
      .eq("mosque_id", ctx.mosqueId);

    await admin.from("audit_logs").insert({
      mosque_id: ctx.mosqueId,
      actor_user_id: ctx.userId,
      action: "student.deactivated",
      target_table: "student_profiles",
      target_id: studentId,
      metadata: {
        full_name: student.full_name,
        profile_id: student.profile_id,
      },
    });
    return ok({ deleted: true, mode: "soft" });
  }

  // hard delete
  await admin.from("audit_logs").insert({
    mosque_id: ctx.mosqueId,
    actor_user_id: ctx.userId,
    action: "student.account_erased",
    target_table: "student_profiles",
    target_id: studentId,
    metadata: { full_name: student.full_name, profile_id: student.profile_id },
  });

  if (student.profile_id) {
    await admin.auth.admin.deleteUser(student.profile_id);
  } else {
    await admin
      .from("student_profiles")
      .delete()
      .eq("id", studentId)
      .eq("mosque_id", ctx.mosqueId);
  }

  return ok({ deleted: true, mode: "hard" });
}
