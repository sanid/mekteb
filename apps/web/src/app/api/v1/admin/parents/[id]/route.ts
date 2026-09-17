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

  const { data: parent } = await supabase
    .from("parent_profiles")
    .select(
      "id, relation, is_active, created_at, updated_at, profiles(id, full_name, display_name, phone, email)",
    )
    .eq("id", id)
    .eq("mosque_id", adminCtx.mosqueId)
    .maybeSingle();

  if (!parent) return notFound("Parent not found.");

  return ok(parent);
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
    relation?: string;
  };
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body");
  }

  const full_name = (body.full_name ?? "").trim();
  const display_name = (body.display_name ?? "").trim() || null;
  const phone = (body.phone ?? "").trim() || null;
  const relation = (body.relation ?? "").trim() || null;

  if (!full_name) return err("Full name is required.");

  const supabase = await createSupabaseForUser(request);

  const { data: parent } = await supabase
    .from("parent_profiles")
    .select("id, profile_id")
    .eq("id", id)
    .eq("mosque_id", adminCtx.mosqueId)
    .maybeSingle();

  if (!parent) return notFound("Parent not found.");

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      full_name,
      display_name,
      phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parent.profile_id);

  if (profileErr) return dbErr(profileErr.message);

  const { error: parentErr } = await supabase
    .from("parent_profiles")
    .update({
      relation,
      updated_by: adminCtx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (parentErr) return dbErr(parentErr.message);

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

  const { data: parent } = await supabase
    .from("parent_profiles")
    .select("id, profile_id")
    .eq("id", id)
    .eq("mosque_id", adminCtx.mosqueId)
    .maybeSingle();

  if (!parent) return notFound("Parent not found.");

  const admin = createSupabaseAdmin();

  await writeAuditLog({
    mosqueId: adminCtx.mosqueId,
    actorUserId: adminCtx.userId,
    action: "parent.account_erased",
    targetTable: "parent_profiles",
    targetId: id,
    metadata: { profile_id: parent.profile_id },
  });

  await admin.auth.admin.deleteUser(parent.profile_id);

  return ok({ deleted: true });
}
