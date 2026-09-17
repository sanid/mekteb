import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

export async function PUT(request: NextRequest) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const body = await request.json();
  const itemIds: string[] = body.itemIds;
  if (!Array.isArray(itemIds) || itemIds.length === 0)
    return err("itemIds must be a non-empty array");

  const supabase = await createSupabaseForUser(request);

  for (let i = 0; i < itemIds.length; i++) {
    const { error } = await supabase
      .from("topics")
      .update({ sort_order: i, updated_by: admin.userId })
      .eq("id", itemIds[i])
      .eq("mosque_id", admin.mosqueId);
    if (error) return dbErr(error.message);
  }

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "topic.reordered",
    targetTable: "topics",
    targetId: admin.mosqueId,
  });

  return ok(null);
}
