import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardCheck } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";

import { acceptExamSchedule, counterExamSchedule, cancelExamSession } from "../../exam-actions";
import { buttonVariants } from "@/components/ui/button";
import { listCard } from "@/components/ui/surfaces";

import { formatDateShort } from "@/lib/format";
type ExamRow = {
  id: string;
  status: string;
  schedule_status: string;
  proposed_date: string | null;
  proposed_by: string | null;
  exam_date: string;
  summary: string | null;
};

export default async function StudentExamsPage() {
  const ctx = await requireStudent();
  await requirePlugin(ctx.mosqueId, "exam_system", "/student");
  const locale = await getLocale();
  const t = await getTranslations("Student");
  const supabase = await createClient();

  const { data: examsRaw } = await supabase
    .from("exam_sessions")
    .select(
      "id, status, schedule_status, proposed_date, proposed_by, exam_date, summary",
    )
    .eq("student_profile_id", ctx.studentProfileId)
    .order("created_at", { ascending: false });
  const exams = ((examsRaw ?? []) as unknown) as ExamRow[];

  const upcoming = exams.filter(
    (e) => !["passed", "failed", "cancelled"].includes(e.status),
  );
  const past = exams.filter((e) =>
    ["passed", "failed", "cancelled"].includes(e.status),
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title={t("upcomingExams")}
        breadcrumbs={[{ href: "/student", label: t("overview") }]}
      />

      {upcoming.length === 0 ? (
        <p className="text-sm text-muted">—</p>
      ) : (
        <ul className={listCard}>
          {upcoming.map((es) => {
            const canAct =
              es.schedule_status === "proposed" ||
              (es.schedule_status === "counter_proposed" && es.proposed_by !== "student");
            const canCancel = ["proposed", "scheduled"].includes(es.status) || es.schedule_status === "proposed";
            return (
              <li key={es.id} className="p-4 space-y-3">
                <div className="text-sm font-medium">
                  {es.schedule_status === "confirmed"
                    ? `${t("examConfirmed" as never)}: ${formatDateShort(es.exam_date, locale)}`
                    : `${t("proposedFor" as never)}: ${(es.proposed_date ? formatDateShort(es.proposed_date, locale) : "—")}`}
                </div>
                {es.summary ? (
                  <p className="text-xs text-muted whitespace-pre-wrap">{es.summary}</p>
                ) : null}
                <div className="flex flex-wrap items-end gap-3">
                  {canAct ? (
                    <>
                      <ActionForm
                        action={acceptExamSchedule.bind(null, es.id)}
                        successMessage="OK"
                      >
                        <button
                          type="submit"
                          className={buttonVariants({ size: "sm" })}
                        >
                          {t("acceptDate" as never)}
                        </button>
                      </ActionForm>
                      <ActionForm
                        action={counterExamSchedule.bind(null, es.id)}
                        successMessage="OK"
                        className="flex items-end gap-2"
                      >
                        <label className="block text-xs">
                          <span className="block text-muted">{t("counterPropose" as never)}</span>
                          <input
                            type="date"
                            name="counter_date"
                            required
                            className="rounded-lg border border-card-border bg-background px-2 py-1 text-xs"
                          />
                        </label>
                        <button
                          type="submit"
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          {t("proposeDifferentDate" as never)}
                        </button>
                      </ActionForm>
                    </>
                  ) : !["passed", "failed"].includes(es.status) ? (
                    <div className="text-xs text-muted">{t("awaitingResponse" as never)}</div>
                  ) : null}
                  {canCancel && (
                    <ActionForm
                      action={cancelExamSession.bind(null, es.id)}
                      successMessage={t("examCancelled" as never)}
                    >
                      <button
                        type="submit"
                        className={buttonVariants({ variant: "destructive", size: "sm" })}
                      >
                        {t("cancelExam" as never)}
                      </button>
                    </ActionForm>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("pastExams" as never)}</h2>
          <ul className={listCard}>
            {past.map((es) => (
              <li key={es.id} className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatDateShort(es.exam_date, locale)}
                  </span>
                  <span
                    className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                      es.status === "passed"
                        ? "bg-success-subtle text-success-fg"
                        : es.status === "cancelled"
                        ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        : "bg-danger-subtle text-danger-fg"
                    }`}
                  >
                    {es.status === "passed"
                      ? "✔"
                      : es.status === "cancelled"
                      ? t("examCancelled" as never)
                      : "✗"}
                  </span>
                </div>
                {es.summary ? (
                  <p className="text-xs text-muted mt-1 whitespace-pre-wrap">{es.summary}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
