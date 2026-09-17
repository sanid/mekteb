import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import {
  okNoStore,
  err,
  unauthorized,
  notFound,
  forbidden,
} from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";

/**
 * Hard-deletes the auth user tied to a GDPR deletion request.
 *
 * Cascade behaviour: `auth.users.id` → `profiles.id` (CASCADE) →
 * teacher_profiles / parent_profiles / student_profiles (CASCADE) plus
 * memberships / message_participants / notification_queue / device_tokens
 * / otp_issues. Historical rows that reference the user via `created_by` /
 * `actor_user_id` use `ON DELETE SET NULL` so attendance, homework and
 * audit history survive (anonymised) — this is the recommended GDPR
 * pattern for educational records.
 *
 * After the cascade, we mark the GDPR request `completed` and write an
 * audit row attributable to the admin who performed the deletion.
 *
 * Self-deletion is blocked: an admin cannot delete their own account via
 * this endpoint.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: req } = await admin
    .from("gdpr_requests")
    .select("id, mosque_id, user_id, type, status, email")
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!req) return notFound("Request not found.");

  if (req.type !== "deletion") {
    return err("Only deletion requests can be executed here.", 400, "wrong_type");
  }
  if (req.status === "completed") {
    return err("This request has already been completed.", 409, "already_done");
  }
  if (req.user_id === ctx.userId) {
    return forbidden("You cannot delete your own account.");
  }

  // 1. Scrub residual PII (login_audit emails, audit_logs metadata,
  //    stray gdpr_requests rows tied to this email) BEFORE the cascade.
  //    This is what makes the deletion truly DSGVO/Art. 17-compliant —
  //    after this point no row in the system still carries the user's
  //    email, name, or phone.
  await admin.rpc("purge_user_pii", {
    target_user_id: req.user_id,
    target_email: req.email ?? "",
  });

  // 2. Hard-delete the auth user. Cascades remove their profile + role
  //    profiles + memberships + push tokens + pending OTPs + notifications.
  //    Audit/attendance/homework rows survive with created_by SET NULL.
  const { error: delErr } = await admin.auth.admin.deleteUser(req.user_id);
  if (delErr) {
    return err(delErr.message, 500, "delete_failed");
  }

  // 3. gdpr_requests has `on delete cascade` on user_id, so the request
  //    row itself is gone now. Insert a tombstone WITHOUT any PII so the
  //    admin UI still shows a deletion happened, but nothing personal
  //    about the deleted user remains.
  const nowIso = new Date().toISOString();
  await admin.from("gdpr_requests").insert({
    mosque_id: req.mosque_id,
    user_id: ctx.userId, // FK requires a valid user; attribute to actor.
    email: null,
    type: "deletion",
    status: "completed",
    reason: null,
    metadata: {},
    requested_at: nowIso,
    processed_at: nowIso,
    processed_by: ctx.userId,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });

  // 4. Audit row also carries no PII — only the fact that an admin
  //    executed a GDPR deletion at this time.
  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "gdpr.user_deleted",
    targetTable: "auth.users",
    targetId: null,
    metadata: {},
  });

  return okNoStore({ deleted: true });
}
