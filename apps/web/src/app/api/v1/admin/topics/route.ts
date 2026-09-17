import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  const { data: topics, error } = await supabase
    .from("topics")
    .select("id, title, description, sort_order, created_at")
    .eq("mosque_id", admin.mosqueId)
    .order("sort_order");

  if (error) return dbErr(error.message);
  return ok(topics);
}

export async function POST(request: NextRequest) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  if (!title) return err("Title is required");

  const supabase = await createSupabaseForUser(request);

  const { data: maxTopic } = await supabase
    .from("topics")
    .select("sort_order")
    .eq("mosque_id", admin.mosqueId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("topics")
    .insert({
      mosque_id: admin.mosqueId,
      title,
      description,
      sort_order: (maxTopic?.sort_order ?? -1) + 1,
      created_by: admin.userId,
      updated_by: admin.userId,
    })
    .select("id")
    .single();

  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "topic.created",
    targetTable: "topics",
    targetId: data.id,
    metadata: { title },
  });

  return ok(data, 201);
}
