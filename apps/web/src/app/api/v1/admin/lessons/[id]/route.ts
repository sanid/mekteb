import { NextRequest } from "next/server";
import type { Json } from "@/lib/supabase/types";

import {
  requireApiAdmin,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized, notFound } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

const BUCKET = "lesson-resources";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await params;
  const supabase = await createSupabaseForUser(request);

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id, title, body, topic_id, sort_order, created_at, updated_at")
    .eq("id", id)
    .eq("mosque_id", admin.mosqueId)
    .maybeSingle();

  if (error) return dbErr(error.message);
  if (!lesson) return notFound("Lesson not found");

  const { data: resources } = await supabase
    .from("lesson_resources")
    .select("id, title, storage_path, mime_type, size_bytes, created_at")
    .eq("lesson_id", id)
    .eq("mosque_id", admin.mosqueId);

  return ok({ ...lesson, resources: resources ?? [] });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await params;
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
  const { error } = await supabase
    .from("lessons")
    .update({
      title,
      body: lessonBody as Json,
      topic_id: topicId,
      updated_by: admin.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("mosque_id", admin.mosqueId);

  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "lesson.updated",
    targetTable: "lessons",
    targetId: id,
    metadata: { title },
  });

  return ok(null);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await params;
  const supabase = await createSupabaseForUser(request);

  const { data: resources } = await supabase
    .from("lesson_resources")
    .select("storage_path")
    .eq("lesson_id", id)
    .eq("mosque_id", admin.mosqueId);

  if (resources && resources.length > 0) {
    const adminClient = createSupabaseAdmin();
    await adminClient.storage
      .from(BUCKET)
      .remove(resources.map((r) => r.storage_path));
  }

  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", id)
    .eq("mosque_id", admin.mosqueId);

  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "lesson.deleted",
    targetTable: "lessons",
    targetId: id,
  });

  return ok(null);
}
