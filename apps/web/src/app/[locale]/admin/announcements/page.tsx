import { getTranslations } from "next-intl/server";
import { Megaphone } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { AnnouncementsHubClient } from "./AnnouncementsHubClient";
import type { NotificationRow } from "@/components/NotificationItem";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params?.tab === "notifications" ? "notifications" : "announcements";

  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const [{ data: announcements }, { data: groups }, { data: notifications }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, audience, is_published, published_at, groups(name)")
      .eq("mosque_id", ctx.mosqueId)
      .order("created_at", { ascending: false }),
    supabase
      .from("groups")
      .select("id, name")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("notification_queue")
      .select(
        "id, subject, body, status, channel, is_read, created_at, source_announcement_id, source_message_id, template_key, template_params, messages:source_message_id(thread_id)"
      )
      .eq("recipient_profile_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const typedNotifications: NotificationRow[] = (notifications ?? []).map((n) => ({
    ...n,
    messages: n.messages as { thread_id: string } | null,
    template_params: n.template_params as Record<string, unknown> | null,
  }));

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Megaphone className="h-5 w-5" />}
        title={t("announcements")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("announcements") },
        ]}
      />

      <AnnouncementsHubClient
        initialTab={initialTab}
        announcements={(announcements ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          audience: a.audience,
          is_published: a.is_published,
          published_at: a.published_at,
          groups: a.groups as { name: string } | null,
        }))}
        groups={(groups ?? []).map((g) => ({
          id: g.id,
          name: g.name,
        }))}
        notifications={typedNotifications}
      />
    </div>
  );
}
