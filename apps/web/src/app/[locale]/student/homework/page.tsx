import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";

import { acknowledgeHomework } from "./actions";
import { formatDate } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";
import { cn } from "@/lib/utils";

function urgencyBadge(dueDate: string | null): { label: string; cls: string } | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return { label: "overdue", cls: "bg-danger-subtle text-danger-fg" };
  if (diff < 3 * 24 * 60 * 60 * 1000) return { label: "soon", cls: "bg-warning-subtle text-warning-fg" };
  return null;
}

export default async function StudentHomeworkPage() {
  const locale = await getLocale();
  const ctx = await requireStudent();
  const t = await getTranslations("Student");
  const supabase = await createClient();

  const [{ data: homework }, { data: submissions }] = await Promise.all([
    supabase
      .from("homework_assignments")
      .select("id, title, body, due_date, audience, is_published, groups(name), homework_targets(student_profile_id)")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_published", true)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("homework_submissions")
      .select("homework_id, acknowledged_at")
      .eq("student_profile_id", ctx.studentProfileId)
      .eq("mosque_id", ctx.mosqueId),
  ]);

  // Filter to homework visible to this student
  const visibleHomework = (homework ?? []).filter((h) => {
    if (h.audience === "group") return true;
    const targets = h.homework_targets as Array<{ student_profile_id: string }> | null;
    return (targets ?? []).some((t) => t.student_profile_id === ctx.studentProfileId);
  });

  const submittedIds = new Set((submissions ?? []).map((s) => s.homework_id));

  const now = new Date();
  const upcoming = visibleHomework.filter((h) => !h.due_date || new Date(h.due_date) >= now);
  const past = visibleHomework.filter((h) => h.due_date && new Date(h.due_date) < now);

  function HomeworkItem({ h }: { h: typeof visibleHomework[0] }) {
    const badge = urgencyBadge(h.due_date);
    const done = submittedIds.has(h.id);
    return (
      <li className={`p-4 space-y-2 ${done ? "opacity-75" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="font-medium text-sm leading-snug flex items-center gap-2">
            {done && <CheckCircle2 className="h-4 w-4 text-success-fg shrink-0" />}
            {h.title}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {badge && !done ? (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                {badge.label === "overdue" ? t("overdue") : t("dueSoon")}
              </span>
            ) : null}
            {h.due_date ? (
              <span className="text-xs text-muted whitespace-nowrap">
                {t("dueDate")}: {formatDate(h.due_date, locale, { month: "short", day: "numeric" })}
              </span>
            ) : null}
          </div>
        </div>
        {h.body ? (
          <p className="text-sm text-muted whitespace-pre-wrap">{h.body}</p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            {(h.groups as { name: string } | null)?.name}
            {h.audience === "individual" ? ` · ${t("individual")}` : ""}
          </span>
          {done ? (
            <span className="text-xs text-success-fg font-medium">{t("markedDone")}</span>
          ) : (
            <ActionForm action={acknowledgeHomework.bind(null, h.id)} successMessage="">
              <button
                type="submit"
                className="text-xs rounded-full border border-card-border px-3 py-1 hover:border-accent hover:text-accent transition-colors"
              >
                {t("markDone")}
              </button>
            </ActionForm>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<CheckCircle2 className="h-5 w-5" />}
        title={t("homework")}
        breadcrumbs={[
          { href: "/student", label: t("overview") },
          { label: t("homework") },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("upcoming")}</h2>
        {upcoming.length > 0 ? (
          <ul className={listCard}>
            {upcoming.map((h) => <HomeworkItem key={h.id} h={h} />)}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("noHomework")}</p>
        )}
      </section>

      {past.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-muted">{t("past")}</h2>
          <ul className={cn(listCard, "opacity-70")}>
            {past.map((h) => <HomeworkItem key={h.id} h={h} />)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
