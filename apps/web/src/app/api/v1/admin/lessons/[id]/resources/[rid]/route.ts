import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

const BUCKET = "lesson-resources";

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; rid: string }> },
) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const { id: lessonId, rid: resourceId } = await params;
  const supabase = await createSupabaseForUser(request);

  const { data: resource } = await supabase
    .from("lesson_resources")
    .select("storage_path")
    .eq("id", resourceId)
    .eq("lesson_id", lessonId)
    .eq("mosque_id", admin.mosqueId)
    .maybeSingle();

  if (!resource) return err("Resource not found");

  const { error: dbError } = await supabase
    .from("lesson_resources")
    .delete()
    .eq("id", resourceId)
    .eq("mosque_id", admin.mosqueId);

  if (dbError) return dbErr(dbError.message);

  const adminClient = createSupabaseAdmin();
  await adminClient.storage.from(BUCKET).remove([resource.storage_path]);

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "lesson.resource_deleted",
    targetTable: "lesson_resources",
    targetId: resourceId,
  });

  return ok(null);
}
