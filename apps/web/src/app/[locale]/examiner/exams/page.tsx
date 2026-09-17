import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardCheck } from "lucide-react";

import { requireExaminer } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";
import { PageHeader } from "@/components/PageHeader";
import DiplomaPicker from "@/components/DiplomaPicker";
import { buttonVariants } from "@/components/ui/button";
import { listCard } from "@/components/ui/surfaces";

import { formatDateShort } from "@/lib/format";
export default async function ExamListPage() {
  const ctx = await requireExaminer();
  await requirePlugin(ctx.mosqueId, "exam_system", "/examiner");
  const locale = await getLocale();
  const t = await getTranslations("Examiner");
  const supabase = await createClient();

  const [{ data: pendingRequests }, { data: allSessions }] = await Promise.all([
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
        "id, exam_request_id, status, summary, exam_date, diploma_generated_at, student_profiles(full_name), groups!exam_sessions_from_group_id_fkey(name)",
      )
      .eq("mosque_id", ctx.mosqueId)
      .order("updated_at", { ascending: false })
      .limit(50),
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

  const statusLabel = (status: string) => {
    switch (status) {
      case "passed": return t("passed");
      case "failed": return t("failed");
      case "in_progress": return t("examStatus_in_progress");
      case "scheduled": return t("examStatus_scheduled");
      default: return status;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title={t("recentExams")}
        breadcrumbs={[
          { href: "/examiner", label: t("overview") },
          { label: t("recentExams") },
        ]}
      />

      {/* Pending requests */}
      {(pendingRequests ?? []).length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{t("pendingRequests")}</h2>
          <ul className={listCard}>
            {(pendingRequests ?? []).map((req) => {
              const student = req.student_profiles as { full_name: string } | null;
              const group = req.groups as { name: string } | null;
              const teacher = req.teacher_profiles as { profiles: { full_name: string } | null } | null;
              const teacherName = (teacher?.profiles as { full_name: string } | null)?.full_name ?? "—";
              return (
                <li key={req.id} className="p-4">
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
                  <div className="text-xs text-muted mt-1">
                    {t("requestedBy")}: {teacherName}
                    {req.notes ? <> · {req.notes}</> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* All exam sessions */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          {(pendingRequests ?? []).length === 0 ? t("pendingRequests") : t("recentExams")}
        </h2>
        <ul className={listCard}>
          {(allSessions ?? []).map((session) => {
            const student = session.student_profiles as { full_name: string } | null;
            const fromGroup = session.groups as { name: string } | null;
            const detailHref = session.exam_request_id
              ? `/examiner/exams/${session.exam_request_id}`
              : null;
            return (
              <li key={session.id} className="p-4 hover:bg-surface">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{student?.full_name ?? "—"}</span>
                    <span className="text-sm text-muted">({fromGroup?.name ?? "—"})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${statusColor(session.status)}`}>
                      {statusLabel(session.status)}
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
                  <div className="mt-1 text-sm text-muted truncate">{session.summary}</div>
                ) : null}
                <div className="mt-1 text-xs text-muted">{t("date")}: {formatDateShort(session.exam_date, locale)}</div>
              </li>
            );
          })}
          {!allSessions || allSessions.length === 0 ? (
            <li className="p-4 text-sm text-muted">{t("noRecentExams")}</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
