import { NextRequest } from "next/server";

import { requireApiAdmin, createSupabaseForUser } from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  const { data, error } = await supabase
    .from("groups")
    .select(`
      id,
      name,
      description,
      is_active,
      created_at,
      updated_at,
      group_enrollments(id, is_active),
      teacher_group_links(id)
    `)
    .eq("mosque_id", ctx.mosqueId)
    .order("name");

  if (error) return dbErr(error.message);

  const mapped = (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    is_active: g.is_active,
    created_at: g.created_at,
    updated_at: g.updated_at,
    student_count: g.group_enrollments?.filter((e) => e.is_active).length ?? 0,
    teacher_count: g.teacher_group_links?.length ?? 0,
  }));

  return ok(mapped);
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  if (!name) return err("Name is required");

  const supabase = await createSupabaseForUser(request);
  const { data, error } = await supabase
    .from("groups")
    .insert({
      mosque_id: ctx.mosqueId,
      name,
      description,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id, name, description, is_active, created_at, updated_at")
    .single();

  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "group.created",
    targetTable: "groups",
    targetId: data.id,
    metadata: { name },
  });

  return ok(data, 201);
}
