import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import {
  okNoStore,
  err,
  unauthorized,
  notFound,
} from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { writeAuditLog } from "@/lib/audit";

const patchSchema = z.object({
  status: z.enum(["completed", "rejected"]),
  note: z.string().trim().max(2000).optional(),
});

/**
 * Mark a GDPR request as completed or rejected. This endpoint only
 * updates the request row — it does NOT itself delete the user. The
 * mosque admin must perform the actual data removal manually (e.g. via
 * the existing student/teacher/parent delete flows) before marking the
 * request completed. This keeps the audit trail honest.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { id } = await params;
  const parsed = await parseJson(request, patchSchema);
  if (!parsed.ok) return parsed.response;
  const { status, note } = parsed.data;

  const admin = createSupabaseAdmin();

  const { data: existing } = await admin
    .from("gdpr_requests")
    .select("id, mosque_id, user_id, type, status")
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!existing) return notFound("Request not found.");

  const { error } = await admin
    .from("gdpr_requests")
    .update({
      status,
      processed_at: new Date().toISOString(),
      processed_by: ctx.userId,
      metadata: note ? { admin_note: note } : undefined,
      updated_by: ctx.userId,
    })
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return err(error.message);

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: `gdpr.${existing.type}_${status}`,
    targetTable: "gdpr_requests",
    targetId: id,
    metadata: { user_id: existing.user_id, note: note ?? null },
  });

  return okNoStore({ updated: true });
}
