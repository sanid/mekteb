import { getTranslations } from "next-intl/server";
import { Megaphone } from "lucide-react";

import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";

import { TeacherAnnouncementListClient } from "./TeacherAnnouncementListClient";

export default async function TeacherAnnouncementsPage() {
  const ctx = await requireTeacher();
  const supabase = await createClient();
  const t = await getTranslations("Teacher");

  const [{ data: announcements }, { data: groups }] = await Promise.all([
    // Drafts included — the list filters them in the client, and edit/delete
    // only ever touches the author's own rows.
    supabase
      .from("announcements")
      .select("id, title, body, audience, is_published, published_at, groups(name)")
      .eq("mosque_id", ctx.mosqueId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("groups")
      .select("id, name")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Megaphone className="h-5 w-5" />}
        title={t("announcements")}
        breadcrumbs={[
          { href: "/teacher", label: t("overview") },
          { label: t("announcements") },
        ]}
      />

      <TeacherAnnouncementListClient
        initialAnnouncements={(announcements ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          audience: a.audience,
          is_published: a.is_published,
          published_at: a.published_at,
          groups: a.groups as { name: string } | null,
        }))}
        groups={(groups ?? []).map((g) => ({ id: g.id, name: g.name }))}
      />
    </div>
  );
}
