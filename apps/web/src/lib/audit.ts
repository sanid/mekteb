import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export async function writeAuditLog(opts: {
  mosqueId: string;
  actorUserId: string;
  action: string;
  targetTable: string;
  targetId: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      mosque_id: opts.mosqueId,
      actor_user_id: opts.actorUserId,
      action: opts.action,
      target_table: opts.targetTable,
      target_id: opts.targetId,
      metadata: opts.metadata as Record<string, string | number | boolean | null> | undefined,
    });
  } catch (err) {
    // Audit failure must never block the action.
    log.warn("[audit] write failed", { error: err instanceof Error ? err.message : String(err) });
  }
}
