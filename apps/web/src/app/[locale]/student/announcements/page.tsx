import { getLocale, getTranslations } from "next-intl/server";

import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatDateShort } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

export default async function StudentAnnouncementsPage() {
  const locale = await getLocale();
  const ctx = await requireStudent();
  const tStudent = await getTranslations("Student");
  const tAdmin = await getTranslations("Admin");
  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, audience, published_at, created_at, profiles(full_name, display_name)")
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title={tStudent("announcements")} />

      <ul className={listCard}>
        {(announcements ?? []).map((a) => {
          const author = a.profiles as { full_name: string | null; display_name: string | null } | null;
          return (
            <li key={a.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-semibold text-sm">{a.title}</h3>
                <span className="shrink-0 text-xs text-muted">
                  {formatDateShort(a.published_at ?? a.created_at, locale)}
                </span>
              </div>
              <p className="text-sm text-muted whitespace-pre-wrap">{a.body}</p>
              {author ? (
                <div className="text-xs text-muted">
                  {author.display_name ?? author.full_name}
                </div>
              ) : null}
            </li>
          );
        })}
        {(announcements ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">{tAdmin("noAnnouncements")}</li>
        ) : null}
      </ul>
    </div>
  );
}
