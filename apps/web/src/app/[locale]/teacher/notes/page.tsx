import { getLocale, getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";

import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatDateShort } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";
import { ActionForm } from "@/components/ActionForm";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateNote, deleteNote } from "../groups/[id]/actions";

import { inputCls } from "@/components/FormField";
export default async function TeacherNotesPage() {
  const locale = await getLocale();
  const ctx = await requireTeacher();
  const t = await getTranslations("Teacher");
  const tAdmin = await getTranslations("Admin");
  const supabase = await createClient();

  const { data: notes } = await supabase
    .from("progress_notes")
    .select(
      "id, body, visible_to_parents, created_at, student_profile_id, student_profiles(full_name), group_id, groups(name)",
    )
    .eq("author_profile_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title={t("allNotes")}
        breadcrumbs={[
          { href: "/teacher", label: t("overview") },
          { label: t("allNotes") },
        ]}
      />

      <ul className={listCard}>
        {(notes ?? []).map((n) => {
          const sp = n.student_profiles as { full_name: string } | null;
          const group = n.groups as { name: string } | null;
          return (
            <li key={n.id} className="p-4 space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-sm">
                  {sp?.full_name ?? "—"}
                </span>
                <span className="text-xs text-muted whitespace-nowrap">
                  {formatDateShort(n.created_at, locale)}
                </span>
              </div>
              <div className="text-sm text-muted whitespace-pre-wrap">
                {n.body}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                {group ? <span>{group.name}</span> : null}
                {!n.visible_to_parents ? (
                  <span className="rounded-full bg-warning-subtle text-warning-fg px-2.5 py-0.5 font-semibold">
                    {t("internalOnly")}
                  </span>
                ) : null}
              </div>

              {/* Edit / delete — this page only lists the caller's own notes,
                  so the controls are always shown. The server actions are
                  author-scoped and revalidate this page. */}
              {n.group_id ? (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted hover:text-foreground transition-colors w-fit">
                    {t("edit")} / {tAdmin("delete")}
                  </summary>
                  <div className="mt-2 space-y-2 border-t border-card-border pt-2">
                    <ActionForm
                      action={updateNote}
                      successMessage={t("noteUpdated")}
                      resetOnSuccess={false}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="note_id" value={n.id} />
                      <input type="hidden" name="group_id" value={n.group_id} />
                      <textarea
                        name="body"
                        required
                        rows={2}
                        defaultValue={n.body}
                        className={inputCls}
                      />
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="visible_to_parents"
                          defaultChecked={n.visible_to_parents}
                        />
                        {t("visibleToParents")}
                      </label>
                      <button className={cn(buttonVariants({ size: "sm" }), "self-start")}>
                        {tAdmin("saveChanges")}
                      </button>
                    </ActionForm>
                    <ActionForm action={deleteNote} successMessage={t("noteDeleted")}>
                      <input type="hidden" name="note_id" value={n.id} />
                      <input type="hidden" name="group_id" value={n.group_id} />
                      <button className={buttonVariants({ variant: "destructive", size: "sm" })}>
                        {t("deleteNote")}
                      </button>
                    </ActionForm>
                  </div>
                </details>
              ) : null}
            </li>
          );
        })}
        {(notes ?? []).length === 0 ? (
          <li className="p-4 text-sm text-muted">{t("noNotes")}</li>
        ) : null}
      </ul>
    </div>
  );
}
