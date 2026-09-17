import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized, notFound } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { writeAuditLog } from "@/lib/audit";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "delete"]),
});

/**
 * Act on one enrolment request — the mobile counterpart of the web server
 * actions `approveEnrollment` / `rejectEnrollment` / `deleteEnrollment`.
 *
 * Approve/reject are status-only, exactly like the web: no account is
 * provisioned from an approved request (the "Approve & create account"
 * loop from MEMORY §7.1 is deliberately still open).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { id } = await params;
  const parsed = await parseJson(request, actionSchema);
  if (!parsed.ok) return parsed.response;
  const { action } = parsed.data;

  const supabase = createSupabaseForUser(request);

  if (action === "delete") {
    const { error } = await supabase
      .from("enrollment_requests")
      .delete()
      .eq("id", id)
      .eq("mosque_id", ctx.mosqueId);
    if (error) return dbErr(error.message);
    await writeAuditLog({
      mosqueId: ctx.mosqueId,
      actorUserId: ctx.userId,
      action: "enrollment.deleted",
      targetTable: "enrollment_requests",
      targetId: id,
    });
    return ok({ deleted: true });
  }

  const status = action === "approve" ? "approved" : "rejected";
  const { error } = await supabase
    .from("enrollment_requests")
    .update({
      status,
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return dbErr(error.message);

  const { data: updated } = await supabase
    .from("enrollment_requests")
    .select("id")
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!updated) return notFound("Enrolment request not found");

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: status === "approved" ? "enrollment.approved" : "enrollment.rejected",
    targetTable: "enrollment_requests",
    targetId: id,
  });

  return ok({ status });
}
