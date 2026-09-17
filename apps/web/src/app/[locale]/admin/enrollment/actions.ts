"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { dbActionErr, type ActionResult } from "@/lib/action-result";


async function setStatus(
  requestId: string,
  status: "approved" | "rejected",
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("enrollment_requests")
    .update({
      status,
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", requestId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message);

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: status === "approved" ? "enrollment.approved" : "enrollment.rejected",
    targetTable: "enrollment_requests",
    targetId: requestId,
  });

  revalidatePath("/[locale]/admin/enrollment", "page");
  return { ok: true };
}

export async function approveEnrollment(requestId: string): Promise<ActionResult> {
  return setStatus(requestId, "approved");
}

export async function rejectEnrollment(requestId: string): Promise<ActionResult> {
  return setStatus(requestId, "rejected");
}

export async function deleteEnrollment(requestId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollment_requests")
    .delete()
    .eq("id", requestId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "deleteEnrollment");
  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "enrollment.deleted",
    targetTable: "enrollment_requests",
    targetId: requestId,
  });
  revalidatePath("/[locale]/admin/enrollment", "page");
  return { ok: true };
}
