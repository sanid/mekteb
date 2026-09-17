import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await params;
  const supabase = await createSupabaseForUser(request);

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id)
    .eq("mosque_id", admin.mosqueId);

  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "announcement.deleted",
    targetTable: "announcements",
    targetId: id,
  });

  return ok(null);
}
