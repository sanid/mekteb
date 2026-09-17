import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";
import { LESSON_RESOURCE_MIME_TYPES } from "@/lib/upload-allowlists";

const BUCKET = "lesson-resources";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const { id: lessonId } = await params;
  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!title) return err("Title is required");
  if (!file || file.size === 0) return err("File is required");
  if (!LESSON_RESOURCE_MIME_TYPES.has(file.type)) {
    return err("Unsupported file type. Allowed: PDF, Office documents, images, plain text, audio, video, ZIP.");
  }

  const supabase = await createSupabaseForUser(request);

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("mosque_id", admin.mosqueId)
    .maybeSingle();
  if (!lesson) return err("Lesson not found");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const storagePath = `${admin.mosqueId}/lessons/${lessonId}/${Date.now()}_${safeName}`;

  const adminClient = createSupabaseAdmin();
  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) return dbErr(uploadError.message);

  const { data, error: dbError } = await supabase
    .from("lesson_resources")
    .insert({
      mosque_id: admin.mosqueId,
      lesson_id: lessonId,
      title,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
      created_by: admin.userId,
      updated_by: admin.userId,
    })
    .select("id")
    .single();

  if (dbError) {
    await adminClient.storage.from(BUCKET).remove([storagePath]);
    return dbErr(dbError.message);
  }

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "lesson.resource_uploaded",
    targetTable: "lesson_resources",
    targetId: data.id,
    metadata: { title },
  });

  return ok(data, 201);
}
