import { getLocale, getTranslations } from "next-intl/server";
import { CalendarRange } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

export default async function StudentWeeklyNotesPage() {
  const locale = await getLocale();
  const ctx = await requireStudent();
  const t = await getTranslations("Student");
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("group_enrollments")
    .select("group_id")
    .eq("student_profile_id", ctx.studentProfileId)
    .eq("is_active", true);

  const groupIds = (enrollments ?? []).map((e) => e.group_id).filter(Boolean);

  const { data: notes } =
    groupIds.length > 0
      ? await supabase
          .from("teacher_weekly_notes")
          .select("id, body, week_start, group_id, groups(name)")
          .eq("is_published", true)
          .in("group_id", groupIds)
          .order("week_start", { ascending: false })
          .limit(100)
      : { data: [] as never[] };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon={<CalendarRange className="h-5 w-5" />}
        title={t("weeklyNotes")}
        breadcrumbs={[
          { href: "/student", label: t("overview") },
          { label: t("weeklyNotes") },
        ]}
      />

      {(notes ?? []).length === 0 ? (
        <p className="text-sm text-muted">{t("noWeeklyNotes")}</p>
      ) : (
        <ul className={listCard}>
          {(notes ?? []).map((n) => {
            const group = n.groups as { name: string } | null;
            return (
              <li key={n.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">
                    {formatDate(n.week_start, locale, { month: "long", day: "numeric" })}
                  </span>
                  {group ? <span className="text-xs text-muted">{group.name}</span> : null}
                </div>
                <div className="text-sm text-muted whitespace-pre-wrap">{n.body}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
