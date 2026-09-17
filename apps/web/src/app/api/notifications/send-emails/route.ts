import { NextResponse } from "next/server";

import { log } from "@/lib/logger";
import { resend, EMAIL_FROM } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  NewMessageEmail,
  AnnouncementEmail,
  HomeworkEmail,
  AbsentEmail,
} from "@/emails/notification-emails";

const BATCH_SIZE = 20;
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
/** Default locale — users land here and next-intl redirects to their preference. */
const DEFAULT_LOCALE = "de";

// ── Auth ───────────────────────────────────────────────────────────────────

function authorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    log.error("[cron] CRON_SECRET not set — rejecting request");
    return false;
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${cronSecret}`;
}

// ── Notification type detection ────────────────────────────────────────────
// Infer template from source IDs and subject prefix — more reliable than
// scanning the body for English keywords.

type NotifType = "message" | "announcement" | "homework" | "absence" | "lesson" | "generic";

function detectType(notif: {
  source_message_id: string | null;
  source_announcement_id: string | null;
  subject: string | null;
}): NotifType {
  if (notif.source_message_id) return "message";
  if (notif.source_announcement_id) return "announcement";
  const sub = notif.subject ?? "";
  if (sub.startsWith("New homework:")) return "homework";
  if (sub.endsWith(" was absent") || sub.includes("absent")) return "absence";
  if (sub.startsWith("Lesson cancelled:")) return "lesson";
  return "generic";
}

// ── Build typed email ──────────────────────────────────────────────────────

// Extract a name from the notification body using simple heuristics.
// Bodies are plain text written by our own code, so patterns are predictable.
function extractStudentName(body: string): string {
  // e.g. "Amina Demirović hat die Hausaufgabe..." or "Test für Amina Demirović"
  const m = body.match(/(?:für|von|:\s*)([A-ZÄÖÜ][a-zäöüß]+ [A-ZÄÖÜ][a-zäöüß]+)/);
  return m?.[1] ?? "";
}

function extractDate(body: string): string {
  // ISO date or localised date in body
  const m = body.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})\b/);
  return m?.[1] ?? "";
}

async function buildEmail(
  notif: {
    subject: string | null;
    body: string;
    source_message_id: string | null;
    source_announcement_id: string | null;
  },
  senderNameMap: Map<string, string>,
): Promise<{ react: React.ReactNode; subject: string }> {
  const url = `${APP_URL}/${DEFAULT_LOCALE}/notifications`;
  const type = detectType(notif);

  switch (type) {
    case "message": {
      const senderName = notif.source_message_id
        ? (senderNameMap.get(notif.source_message_id) ?? "")
        : "";
      return {
        subject: notif.subject ?? "Neue Nachricht",
        react: NewMessageEmail({
          senderName,
          subject: notif.subject ?? "",
          preview: notif.body,
          url,
        }),
      };
    }

    case "announcement":
      return {
        subject: notif.subject ?? "Neue Ankündigung",
        react: AnnouncementEmail({
          title: notif.subject ?? "Ankündigung",
          preview: notif.body,
          url,
        }),
      };

    case "homework":
      return {
        subject: notif.subject ?? "Neue Hausaufgabe",
        react: HomeworkEmail({
          studentName: extractStudentName(notif.body),
          title: notif.subject?.replace(/^New homework:\s*/i, "").replace(/^Neue Hausaufgabe:\s*/i, "") ?? "Neue Hausaufgabe",
          dueDate: extractDate(notif.body) || null,
          url,
        }),
      };

    case "absence":
      return {
        subject: notif.subject ?? "Abwesenheit",
        react: AbsentEmail({
          studentName: extractStudentName(notif.body),
          sessionDate: extractDate(notif.body),
          url,
        }),
      };

    case "lesson":
      return {
        subject: "Lektion abgesagt",
        react: AnnouncementEmail({
          title: "Lektion abgesagt",
          preview: notif.body,
          url,
        }),
      };

    default:
      return {
        subject: notif.subject ?? "Neue Benachrichtigung",
        react: AnnouncementEmail({
          title: notif.subject ?? "Benachrichtigung",
          preview: notif.body,
          url,
        }),
      };
  }
}

// ── Paginated user list ────────────────────────────────────────────────────

async function fetchEmailMap(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const target = new Set(userIds);
  const PER_PAGE = 1000;
  let page = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error || !data) break;
    for (const u of data.users) {
      if (target.has(u.id) && u.email) {
        map.set(u.id, u.email);
      }
    }
    // Stop when all target users are found or we've exhausted all pages.
    if (data.users.length < PER_PAGE || map.size >= target.size) break;
    page++;
  }

  return map;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: notifications, error: fetchErr } = await admin
    .from("notification_queue")
    .select(
      "id, mosque_id, recipient_profile_id, channel, subject, body, source_message_id, source_announcement_id",
    )
    .eq("channel", "email")
    .is("email_sent_at", null)
    .eq("status", "sent")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!notifications || notifications.length === 0) {
    return NextResponse.json({ processed: 0, failed: 0 });
  }

  // Only send to active members — deactivated accounts don't get emails.
  const recipientIds = [...new Set(notifications.map((n) => n.recipient_profile_id))];

  const { data: members } = await admin
    .from("memberships")
    .select("user_id")
    .in("user_id", recipientIds)
    .eq("is_active", true);

  const activeUserIds = new Set((members ?? []).map((m) => m.user_id));
  const activeRecipients = recipientIds.filter((id) => activeUserIds.has(id));

  const profileWithEmail = await fetchEmailMap(admin, activeRecipients);

  // Prefetch all message senders in one query to avoid N+1.
  const messageIds = notifications
    .filter((n) => n.source_message_id)
    .map((n) => n.source_message_id as string);
  const senderNameMap = new Map<string, string>();
  if (messageIds.length > 0) {
    const { data: messages } = await admin
      .from("messages")
      .select("id, profiles(full_name, display_name)")
      .in("id", messageIds);
    for (const msg of messages ?? []) {
      const prof = msg.profiles as { full_name: string | null; display_name: string | null } | null;
      senderNameMap.set(msg.id, prof?.display_name ?? prof?.full_name ?? "");
    }
  }

  let processed = 0;
  let failed = 0;

  for (const notif of notifications) {
    const email = profileWithEmail.get(notif.recipient_profile_id);
    if (!email) {
      // Inactive or unknown user — mark as sent to skip forever.
      await admin
        .from("notification_queue")
        .update({
          email_sent_at: new Date().toISOString(),
          error: "no_active_email",
          updated_at: new Date().toISOString(),
        })
        .eq("id", notif.id);
      failed++;
      continue;
    }

    const { react, subject } = await buildEmail(notif, senderNameMap);

    const { error: sendErr } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject,
      react,
      tags: [
        { name: "notification_id", value: notif.id },
        { name: "mosque_id", value: notif.mosque_id },
      ],
    });

    if (sendErr) {
      await admin
        .from("notification_queue")
        .update({
          error: sendErr.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", notif.id);
      failed++;
      continue;
    }

    await admin
      .from("notification_queue")
      .update({
        email_sent_at: new Date().toISOString(),
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", notif.id);

    processed++;
  }

  return NextResponse.json({
    processed,
    failed,
    total: notifications.length,
    remaining: notifications.length === BATCH_SIZE ? "more" : "none",
  });
}
