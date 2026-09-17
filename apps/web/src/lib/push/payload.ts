import { notificationText } from "@/lib/notification-text";
import { defaultLocale, isLocale, messages, type Locale } from "@mekteb/i18n";

/**
 * Builds a push payload for one notification in one locale.
 *
 * `title`/`body` come from the same template renderer the inbox uses, so the
 * push says what the inbox says. The `data` mirrors
 * apps/mobile/src/lib/push.ts `routeForNotification`: `threadId` opens a
 * thread, `writtenTestToken` opens the test, `announcementId` opens the inbox
 * on the announcements tab; anything else lands on the inbox.
 */

export type PushPayload = { title: string; body: string; data: Record<string, string> };

export type PushNotification = {
  subject: string | null;
  body: string;
  created_at: string;
  template_key?: string | null;
  template_params?: Record<string, unknown> | null;
  thread_id?: string | null;
  source_announcement_id?: string | null;
};

function translateFor(locale: Locale) {
  const ns = messages[locale].Notifications as Record<string, string>;
  return (key: string, values?: Record<string, string | number>): string => {
    let text = ns[key];
    if (!text) return key;
    for (const [k, v] of Object.entries(values ?? {})) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
    return text;
  };
}

/** The notification row itself has no locale — the device token's does. */
export function resolveLocale(value: string | null | undefined): Locale {
  return value && isLocale(value) ? value : defaultLocale;
}

export function buildPushPayload(
  notif: PushNotification,
  locale: Locale,
): PushPayload {
  const t = translateFor(locale);
  const { subject, body } = notificationText(notif, t, locale, t("noSubject"));
  const data: Record<string, string> = {};
  if (notif.thread_id) data.threadId = notif.thread_id;
  if (notif.source_announcement_id) data.announcementId = notif.source_announcement_id;
  // The written-test row stores its token in template_params (see
  // enqueueExamNotifications / the written-tests API route).
  const params = (notif.template_params ?? {}) as Record<string, unknown>;
  if (notif.template_key === "written_test.new" && typeof params.token === "string") {
    data.writtenTestToken = params.token;
  }
  return { title: subject, body, data };
}
