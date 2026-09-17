import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized, notFound } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  ctx: RouteContext,
) {
  const adminCtx = await requireApiAdmin(request);
  if (!adminCtx) return unauthorized();

  const { id } = await ctx.params;
  const supabase = await createSupabaseForUser(request);

  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select(
      "id, bio, is_active, created_at, updated_at, profiles(id, full_name, display_name, phone, email)",
    )
    .eq("id", id)
    .eq("mosque_id", adminCtx.mosqueId)
    .maybeSingle();

  if (!teacher) return notFound("Teacher not found.");

  return ok(teacher);
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext,
) {
  const adminCtx = await requireApiAdmin(request);
  if (!adminCtx) return unauthorized();

  const { id } = await ctx.params;

  let body: {
    full_name?: string;
    display_name?: string;
    phone?: string;
    bio?: string;
  };
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body");
  }

  const full_name = (body.full_name ?? "").trim();
  const display_name = (body.display_name ?? "").trim() || null;
  const phone = (body.phone ?? "").trim() || null;
  const bio = (body.bio ?? "").trim() || null;

  if (!full_name) return err("Full name is required.");

  const supabase = await createSupabaseForUser(request);

  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("id, profile_id")
    .eq("id", id)
    .eq("mosque_id", adminCtx.mosqueId)
    .maybeSingle();

  if (!teacher) return notFound("Teacher not found.");

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      full_name,
      display_name,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", teacher.profile_id);

  if (profileErr) return dbErr(profileErr.message);

  const { error: teacherErr } = await supabase
    .from("teacher_profiles")
    .update({
      bio,
      updated_by: adminCtx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (teacherErr) return dbErr(teacherErr.message);

  return ok({ updated: true });
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext,
) {
  const adminCtx = await requireApiAdmin(request);
  if (!adminCtx) return unauthorized();

  const { id } = await ctx.params;
  const supabase = await createSupabaseForUser(request);

  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("id, profile_id")
    .eq("id", id)
    .eq("mosque_id", adminCtx.mosqueId)
    .maybeSingle();

  if (!teacher) return notFound("Teacher not found.");

  const admin = createSupabaseAdmin();

  await writeAuditLog({
    mosqueId: adminCtx.mosqueId,
    actorUserId: adminCtx.userId,
    action: "teacher.account_erased",
    targetTable: "teacher_profiles",
    targetId: id,
    metadata: { profile_id: teacher.profile_id },
  });

  await admin.auth.admin.deleteUser(teacher.profile_id);

  return ok({ deleted: true });
}
