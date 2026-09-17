import { NextResponse } from "next/server";

import { log } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApns } from "@/lib/push/apns";
import { sendFcm } from "@/lib/push/fcm";
import { buildPushPayload, resolveLocale } from "@/lib/push/payload";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 20;
/** Only recent rows: a first run must not re-push months of history. */
const PUSH_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

// ── Auth ───────────────────────────────────────────────────────────────────
// The cron (CRON_SECRET) and the pg_net webhook trigger (a secret that lives
// in app.push_webhook_config, mirrored as PUSH_WEBHOOK_SECRET) both deliver
// here. Accepting either keeps the cron the backstop while the trigger fires
// the instant a row lands.

function authorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length);
  return token === process.env.CRON_SECRET || token === process.env.PUSH_WEBHOOK_SECRET;
}

// ── Handler ────────────────────────────────────────────────────────────────

type PushRow = {
  id: string;
  recipient_profile_id: string;
  subject: string | null;
  body: string;
  created_at: string;
  template_key?: string | null;
  template_params?: Record<string, unknown> | null;
  source_message_id?: string | null;
  source_announcement_id?: string | null;
  thread_id?: string | null;
};

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // The pg_net trigger posts { notificationId } to deliver exactly that row
  // the moment it lands. A request without one is the cron batch.
  let notificationId: string | null = null;
  try {
    const body = (await request.json().catch(() => null)) as {
      notificationId?: string;
    } | null;
    notificationId = typeof body?.notificationId === "string" ? body.notificationId : null;
  } catch {
    notificationId = null;
  }

  let query = admin
    .from("notification_queue")
    .select(
      "id, recipient_profile_id, subject, body, created_at, template_key, template_params, source_message_id, source_announcement_id, messages:source_message_id(thread_id)",
    )
    .is("pushed_at", null)
    .eq("status", "sent");

  // Rows the fanout triggers wrote are all `channel = 'email'`, so pending is
  // `pushed_at is null` (see 20260812000001_notification_push_tracking.sql).
  if (notificationId) {
    query = query.eq("id", notificationId).limit(1);
  } else {
    query = query
      .gt("created_at", new Date(Date.now() - PUSH_WINDOW_MS).toISOString())
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);
  }

  const { data: notifications, error: fetchErr } = await query;

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!notifications || notifications.length === 0) {
    return NextResponse.json({ processed: 0, pushed: 0, devices: 0, failed: 0 });
  }

  // Flatten the message join (mirrors /api/v1/notifications).
  const rows: PushRow[] = (notifications as unknown as (PushRow & { messages: { thread_id: string } | null })[]).map(
    ({ messages, ...rest }) => ({ ...rest, thread_id: messages?.thread_id ?? null }),
  );

  // One query for every device that could receive anything in this batch.
  const recipientIds = [...new Set(rows.map((n) => n.recipient_profile_id))];
  const { data: devices } = await admin
    .from("device_tokens")
    .select("id, user_id, platform, token, locale")
    .in("user_id", recipientIds);

  const devicesByUser = new Map<string, NonNullable<typeof devices>>();
  for (const d of devices ?? []) {
    const list = devicesByUser.get(d.user_id) ?? [];
    list.push(d);
    devicesByUser.set(d.user_id, list);
  }

  let processed = 0;
  let pushed = 0;
  let devicesSent = 0;
  let failed = 0;

  for (const notif of rows) {
    const userDevices = devicesByUser.get(notif.recipient_profile_id) ?? [];
    if (userDevices.length === 0) {
      // Nobody has a device; mark sent so the row never re-enters this job.
      await admin
        .from("notification_queue")
        .update({ pushed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", notif.id);
      processed++;
      continue;
    }

    let batchSent = 0;
    let batchFailed = 0;

    for (const device of userDevices) {
      // Per-device locale: a family phone may hold tokens for two locales.
      // The notification row itself has no locale (the fanout triggers write
      // English words) — the device token's locale is the only hint of what
      // the reader understands.
      const deviceLocale = resolveLocale(device.locale);
      const payload = buildPushPayload(notif, deviceLocale);

      const result =
        device.platform === "ios"
          ? await sendApns(device.token, payload)
          : device.platform === "android"
            ? await sendFcm(device.token, payload)
            : null;

      if (!result) {
        continue; // unknown platform — skip but keep the token
      }

      if (result.ok) {
        devicesSent++;
        batchSent++;
        continue;
      }

      // A dead token must go now, or every future fanout retries it forever.
      if (result.reason === "unregistered" || result.reason === "invalid_token") {
        await admin.from("device_tokens").delete().eq("id", device.id);
        log.info("[push] dropped stale device token", { deviceId: device.id, reason: result.reason });
        failed++;
        continue;
      }

      // Transient (APNs 503, FCM rate limit, missing creds) — leave the row
      // pending for the next cron tick; the error lands in the log.
      log.warn("[push] delivery failed", { notificationId: notif.id, message: result.message });
      batchFailed++;
    }

    if (batchSent > 0 || batchFailed === 0) {
      await admin
        .from("notification_queue")
        .update({ pushed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", notif.id);
      processed++;
      pushed += batchSent > 0 ? 1 : 0;
    } else {
      failed += batchFailed;
    }
  }

  return NextResponse.json({ processed, pushed, devices: devicesSent, failed });
}
