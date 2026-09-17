import { getLocale, getTranslations } from "next-intl/server";
import { NotebookPen } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatDateShort } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

export default async function StudentProgressNotesPage() {
  const locale = await getLocale();
  const ctx = await requireStudent();
  const t = await getTranslations("Student");
  const supabase = await createClient();

  const { data: notes } = await supabase
    .from("progress_notes")
    .select("id, body, created_at, group_id, groups(name)")
    .eq("student_profile_id", ctx.studentProfileId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon={<NotebookPen className="h-5 w-5" />}
        title={t("myProgressNotes")}
        breadcrumbs={[
          { href: "/student", label: t("overview") },
          { label: t("myProgressNotes") },
        ]}
      />

      {(notes ?? []).length === 0 ? (
        <p className="text-sm text-muted">{t("noProgressNotes")}</p>
      ) : (
        <ul className={listCard}>
          {(notes ?? []).map((n) => {
            const group = n.groups as { name: string } | null;
            return (
              <li key={n.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted whitespace-nowrap">
                    {formatDateShort(n.created_at, locale)}
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
