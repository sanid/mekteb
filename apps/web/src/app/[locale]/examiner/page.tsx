import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardCheck } from "lucide-react";

import { requireExaminer } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { Link } from "@/i18n/routing";
import DiplomaPicker from "@/components/DiplomaPicker";
import { buttonVariants } from "@/components/ui/button";
import { listCard } from "@/components/ui/surfaces";
import { PrayerTimesSection } from "@/components/PrayerTimesSection";

import { formatDateShort } from "@/lib/format";
export default async function ExaminerDashboardPage() {
  const ctx = await requireExaminer();
  await requirePlugin(ctx.mosqueId, "exam_system", "/admin");
  const locale = await getLocale();
  const t = await getTranslations("Examiner");
  const supabase = await createClient();

  const [{ data: pendingRequests }, { data: recentSessions }] = await Promise.all([
    supabase
      .from("exam_requests")
      .select(
        "id, notes, created_at, student_profiles(full_name), groups(name), teacher_profiles(profiles(full_name))",
      )
      .eq("mosque_id", ctx.mosqueId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("exam_sessions")
      .select(
        "id, exam_request_id, status, summary, exam_date, from_group_id, to_group_id, diploma_generated_at, student_profiles(full_name), groups!exam_sessions_from_group_id_fkey(name)",
      )
      .eq("mosque_id", ctx.mosqueId)
      .in("status", ["scheduled", "in_progress", "passed", "failed"])
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  const statusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-success-subtle text-success-fg";
      case "failed":
        return "bg-danger-subtle text-danger-fg";
      case "in_progress":
        return "bg-warning-subtle text-warning-fg";
      default:
        return "bg-info-subtle text-info-fg";
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title={t("welcome")}
        description={t("welcomeSub")}
      />

      {/* Pending requests */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("pendingRequests")}</h2>
        <ul className={listCard}>
          {(pendingRequests ?? []).map((req) => {
            const student = req.student_profiles as { full_name: string } | null;
            const group = req.groups as { name: string } | null;
            const teacher = req.teacher_profiles as { profiles: { full_name: string } | null } | null;
            const teacherName = (teacher?.profiles as { full_name: string } | null)?.full_name ?? "—";
            return (
              <li key={req.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{student?.full_name ?? "—"}</span>
                    <span className="text-sm text-muted ml-2">({group?.name ?? "—"})</span>
                  </div>
                  <Link
                    href={`/examiner/exams/${req.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {t("acceptAndStart")}
                  </Link>
                </div>
                <div className="text-xs text-muted">
                  {t("requestedBy")}: {teacherName}
                  {req.notes ? <> · {req.notes}</> : null}
                </div>
              </li>
            );
          })}
          {!pendingRequests || pendingRequests.length === 0 ? (
            <li className="p-4 text-sm text-muted">{t("noPendingRequests")}</li>
          ) : null}
        </ul>
      </section>

      {/* Recent exams */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("recentExams")}</h2>
        <ul className={listCard}>
          {(recentSessions ?? []).map((session) => {
            const student = session.student_profiles as { full_name: string } | null;
            const fromGroup = session.groups as { name: string } | null;
            const statusLabel = t(`examStatus_${session.status}` as "examStatus_scheduled" | "examStatus_in_progress" | "examStatus_passed" | "examStatus_failed");
            const detailHref = (session as { exam_request_id: string | null }).exam_request_id
              ? `/examiner/exams/${(session as { exam_request_id: string }).exam_request_id}`
              : null;
            return (
              <li key={session.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{student?.full_name ?? "—"}</span>
                    <span className="text-sm text-muted">({fromGroup?.name ?? "—"})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${statusColor(session.status)}`}>
                      {statusLabel}
                    </span>
                    {detailHref ? (
                      <Link
                        href={detailHref}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {t("examDetail")}
                      </Link>
                    ) : null}
                    {session.status === "passed" ? (
                      <DiplomaPicker sessionId={session.id} label={t("generateDiploma")} />
                    ) : null}
                  </div>
                </div>
                {session.summary ? (
                  <div className="mt-1 text-sm text-muted">{session.summary}</div>
                ) : null}
                <div className="mt-1 text-xs text-muted">{t("date")}: {formatDateShort(session.exam_date, locale)}</div>
              </li>
            );
          })}
          {!recentSessions || recentSessions.length === 0 ? (
            <li className="p-4 text-sm text-muted">{t("noRecentExams")}</li>
          ) : null}
        </ul>
      </section>
      <PrayerTimesSection mosqueId={ctx.mosqueId} />
    </div>
  );
}
