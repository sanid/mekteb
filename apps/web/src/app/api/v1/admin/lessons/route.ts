import { NextRequest } from "next/server";
import type { Json } from "@/lib/supabase/types";

import {
  requireApiAdmin,
  requireApiTeacher,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  // Accept both admin and teacher roles
  const admin = await requireApiAdmin(request);
  const teacher = admin ? null : await requireApiTeacher(request);
  const mosqueId = admin?.mosqueId ?? teacher?.mosqueId;
  if (!mosqueId) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  const { data: lessons, error } = await supabase
    .from("lessons")
    .select("id, title, topic_id, sort_order")
    .eq("mosque_id", mosqueId)
    .order("sort_order");

  if (error) return dbErr(error.message);
  return ok(lessons ?? []);
}

export async function POST(request: NextRequest) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const rawBody = body.body;
  let lessonBody: unknown = null;
  if (Array.isArray(rawBody) && rawBody.length > 0) {
    lessonBody = rawBody;
  }
  const topicId = String(body.topic_id ?? "").trim() || null;
  if (!title) return err("Title is required");

  const supabase = await createSupabaseForUser(request);

  let query = supabase
    .from("lessons")
    .select("sort_order")
    .eq("mosque_id", admin.mosqueId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (topicId) {
    query = query.eq("topic_id", topicId);
  } else {
    query = query.is("topic_id", null);
  }

  const { data: maxLesson } = await query.maybeSingle();

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      mosque_id: admin.mosqueId,
      topic_id: topicId,
      title,
      body: lessonBody as Json,
      sort_order: (maxLesson?.sort_order ?? -1) + 1,
      created_by: admin.userId,
      updated_by: admin.userId,
    })
    .select("id")
    .single();

  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "lesson.created",
    targetTable: "lessons",
    targetId: data.id,
    metadata: { title },
  });

  return ok(data, 201);
}
