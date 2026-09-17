import { NextRequest } from "next/server";
import { z } from "zod";

import {
  extractUser,
  createSupabaseAdmin,
  resolveApiRole,
} from "@/app/api/v1/helpers/api-auth";
import { log } from "@/lib/logger";
import {
  okNoStore,
  err,
  unauthorized,
  tooMany,
} from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { checkRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  reason: z.string().trim().max(2000).optional(),
});

/**
 * Submits an account-deletion request. We do NOT delete anything here —
 * the mosque admin is notified (DB trigger fans out to notification_queue)
 * and processes deletion manually. This way the admin retains accountability
 * over irreversible operations and can preserve attendance/audit data where
 * legally required.
 */
export async function POST(request: NextRequest) {
  const user = await extractUser(request);
  if (!user) return unauthorized();

  const role = await resolveApiRole(user.userId, request);
  if (role === "mosque_admin") {
    return err(
      "Mosque administrators cannot request account deletion.",
      403,
      "admin_forbidden",
    );
  }

  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;

  const limit = await checkRateLimit({
    bucket: "gdpr-delete",
    key: user.userId,
    windowMs: 24 * 60 * 60 * 1000,
    maxRequests: 3,
  });
  if (!limit.allowed) {
    return tooMany(
      "You can submit at most 3 deletion requests per day.",
      limit.retryAfterMs,
    );
  }

  const admin = createSupabaseAdmin();

  let mosqueId: string | null = null;
  if (role === "student") {
    const { data } = await admin
      .from("student_profiles")
      .select("mosque_id")
      .eq("profile_id", user.userId)
      .eq("is_active", true)
      .maybeSingle();
    mosqueId = data?.mosque_id ?? null;
  } else {
    const { data } = await admin
      .from("memberships")
      .select("mosque_id")
      .eq("user_id", user.userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    mosqueId = data?.mosque_id ?? null;
  }

  if (!mosqueId) {
    return err(
      "You must belong to a mosque to submit a deletion request.",
      400,
      "no_mosque",
    );
  }

  // Reject if a pending request already exists.
  const { data: existing } = await admin
    .from("gdpr_requests")
    .select("id")
    .eq("user_id", user.userId)
    .eq("type", "deletion")
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (existing) {
    return err(
      "You already have a pending deletion request.",
      409,
      "already_pending",
    );
  }

  const { data: reqRow, error } = await admin
    .from("gdpr_requests")
    .insert({
      mosque_id: mosqueId,
      user_id: user.userId,
      email: user.email,
      type: "deletion",
      status: "pending",
      reason: parsed.data.reason ?? null,
      created_by: user.userId,
      updated_by: user.userId,
    })
    .select("id")
    .single();
  if (error || !reqRow) {
    log.error("[gdpr] deletion request insert failed", { error: error?.message });
    return err("Could not submit deletion request");
  }

  await writeAuditLog({
    mosqueId,
    actorUserId: user.userId,
    action: "gdpr.deletion_requested",
    targetTable: "gdpr_requests",
    targetId: reqRow.id,
  });

  return okNoStore({ requested: true, requestId: reqRow.id });
}
