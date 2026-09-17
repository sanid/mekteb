import { getLocale, getTranslations } from "next-intl/server";
import { Megaphone } from "lucide-react";

import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatDateShort } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

export default async function ParentAnnouncementsPage() {
  const locale = await getLocale();
  const ctx = await requireParent();
  const supabase = await createClient();
  const t = await getTranslations("Parent");

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, audience, published_at, groups(name)")
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Megaphone className="h-5 w-5" />}
        title={t("announcements")}
        breadcrumbs={[
          { href: "/parent", label: t("overview") },
          { label: t("announcements") },
        ]}
      />

      <ul className={listCard}>
        {(announcements ?? []).map((a) => {
          const groupName = (a.groups as { name: string } | null)?.name;
          return (
            <li key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{a.title}</div>
                {groupName ? (
                  <span className="shrink-0 text-xs text-muted bg-card-border rounded px-1.5 py-0.5">
                    {groupName}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted whitespace-pre-line">{a.body}</p>
              {a.published_at ? (
                <div className="mt-1 text-xs text-muted">
                  {formatDateShort(a.published_at, locale)}
                </div>
              ) : null}
            </li>
          );
        })}
        {!announcements || announcements.length === 0 ? (
          <li className="p-4 text-sm text-muted">{t("noAnnouncements")}</li>
        ) : null}
      </ul>
    </div>
  );
}
