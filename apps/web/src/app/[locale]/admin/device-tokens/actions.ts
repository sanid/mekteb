"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { actionError } from "@/lib/action-errors";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";

export async function deleteDeviceToken(tokenId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("device_tokens")
    .delete()
    .eq("id", tokenId)
    .eq("mosque_id", ctx.mosqueId)
    .select("id")
    .maybeSingle();

  if (error) return await dbActionErr(error.message, "deleteDeviceToken");
  if (!data) return await actionError("device_token_not_found");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "device_token.deleted",
    targetTable: "device_tokens",
    targetId: tokenId,
  });

  revalidatePath("/[locale]/admin/device-tokens", "page");
  return { ok: true };
}
