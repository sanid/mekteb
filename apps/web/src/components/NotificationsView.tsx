import { getLocale, getTranslations } from "next-intl/server";
import { Bell } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";
import { PageHeader } from "@/components/PageHeader";
import { NotificationItem } from "@/components/NotificationItem";
import type { PortalRole } from "@/components/PortalShell";
import { listCard } from "@/components/ui/surfaces";

/**
 * The notification inbox, shared by all five portals.
 *
 * The per-portal pages differed only in which `requireX` guard ran and which
 * namespace supplied the breadcrumb label, so everything else — the query,
 * the empty state, the deep links — lives here and is fixed once.
 */
export async function NotificationsView({
  role,
  namespace,
  userId,
}: {
  role: PortalRole;
  namespace: "Admin" | "Teacher" | "Parent" | "Student" | "Examiner";
  userId: string;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Notifications");
  const tRole = await getTranslations(namespace);
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notification_queue")
    .select(
      "id, subject, body, status, channel, is_read, created_at, source_announcement_id, source_message_id, template_key, template_params, messages:source_message_id(thread_id)",
    )
    .eq("recipient_profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6 max-w-4xl">
      <MarkNotificationsRead />
      <PageHeader
        icon={<Bell className="h-5 w-5" />}
        title={t("notifications")}
        breadcrumbs={[
          { href: `/${role}`, label: tRole("overview") },
          { label: t("notifications") },
        ]}
      />

      <ul className={listCard}>
        {(notifications ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">{t("noNotifications")}</li>
        ) : (
          (notifications ?? []).map((n) => (
            <NotificationItem
              key={n.id}
              n={{
                ...n,
                messages: n.messages as { thread_id: string } | null,
                template_params: n.template_params as Record<string, unknown> | null,
              }}
              messagesHref={`/${role}/messages`}
              announcementsHref={`/${role}/announcements`}
              noSubjectLabel={t("noSubject")}
              locale={locale}
              t={t}
            />
          ))
        )}
      </ul>
    </div>
  );
}
