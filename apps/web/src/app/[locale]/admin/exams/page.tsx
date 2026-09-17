import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardCheck, ChevronRight } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import DiplomaPicker from "@/components/DiplomaPicker";
import { buttonVariants } from "@/components/ui/button";
import { listCard } from "@/components/ui/surfaces";

import { formatDateShort } from "@/lib/format";
type PageProps = { searchParams: Promise<{ status?: string; group?: string }> };

export default async function AdminExamsPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "exam_system", "/admin");
  const locale = await getLocale();
  const t = await getTranslations("Admin");
  const te = await getTranslations("Examiner");
  const supabase = await createClient();
  const params = await searchParams;

  const filterStatus = params.status ?? "";
  const filterGroup = params.group ?? "";

  const [{ data: allSessions }, { data: groups }] = await Promise.all([
    supabase
      .from("exam_sessions")
      .select(
        "id, exam_request_id, status, summary, exam_date, diploma_generated_at, student_profiles(full_name), groups!exam_sessions_from_group_id_fkey(id, name), examiner_profile_id, teacher_profiles!exam_sessions_examiner_profile_id_fkey(profiles(full_name))",
      )
      .eq("mosque_id", ctx.mosqueId)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("groups")
      .select("id, name")
      .eq("mosque_id", ctx.mosqueId)
      .order("name"),
  ]);

  const [{ data: pendingRequests }] = await Promise.all([
    supabase
      .from("exam_requests")
      .select(
        "id, notes, created_at, student_profiles(full_name), groups(name), teacher_profiles(profiles(full_name))",
      )
      .eq("mosque_id", ctx.mosqueId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  let sessions = allSessions ?? [];
  if (filterStatus) {
    sessions = sessions.filter((s) => s.status === filterStatus);
  }
  if (filterGroup) {
    sessions = sessions.filter((s) => {
      const g = s.groups as { id: string; name: string } | null;
      return g?.id === filterGroup;
    });
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-success-subtle text-success-fg";
      case "failed":
        return "bg-danger-subtle text-danger-fg";
      case "in_progress":
        return "bg-warning-subtle text-warning-fg";
      case "scheduled":
        return "bg-accent-subtle text-accent";
      default:
        return "bg-info-subtle text-info-fg";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "passed":
        return te("passed");
      case "failed":
        return te("failed");
      case "in_progress":
        return te("examStatus_in_progress");
      case "scheduled":
        return te("examStatus_scheduled");
      case "proposed":
        return t("examStatus_proposed");
      default:
        return status;
    }
  };

  const passed = sessions.filter((s) => s.status === "passed").length;
  const failed = sessions.filter((s) => s.status === "failed").length;
  const total = sessions.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title={t("exams")}
        breadcrumbs={[{ href: "/admin", label: t("overview") }, { label: t("exams") }]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-card-border p-4">
          <div className="text-2xl font-semibold">{total}</div>
          <div className="text-xs text-muted">{t("examTotal")}</div>
        </div>
        <div className="rounded-xl border border-card-border p-4">
          <div className="text-2xl font-semibold text-success-fg">{passed}</div>
          <div className="text-xs text-muted">{t("examPassed")}</div>
        </div>
        <div className="rounded-xl border border-card-border p-4">
          <div className="text-2xl font-semibold text-danger-fg">{failed}</div>
          <div className="text-xs text-muted">{t("examFailed")}</div>
        </div>
        <div className="rounded-xl border border-card-border p-4">
          <div className="text-2xl font-semibold">{passRate}%</div>
          <div className="text-xs text-muted">{t("examPassRateYear")}</div>
        </div>
      </div>

      <form method="GET" className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-muted mb-1">{t("filterByStatus")}</label>
          <select
            name="status"
            defaultValue={filterStatus}
            className="rounded-lg border border-card-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">{t("allStatuses")}</option>
            <option value="proposed">{t("examStatus_proposed")}</option>
            <option value="scheduled">{te("examStatus_scheduled")}</option>
            <option value="in_progress">{te("examStatus_in_progress")}</option>
            <option value="passed">{te("passed")}</option>
            <option value="failed">{te("failed")}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{t("filterByGroup")}</label>
          <select
            name="group"
            defaultValue={filterGroup}
            className="rounded-lg border border-card-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">{t("allGroups")}</option>
            {(groups ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className={buttonVariants({ size: "xl" })}
        >
          {t("filter")}
        </button>
        {(filterStatus || filterGroup) && (
          <Link
            href="/admin/exams"
            className={buttonVariants({ variant: "outline" })}
          >
            {t("clearFilter")}
          </Link>
        )}
      </form>

      {(pendingRequests ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{te("pendingRequests")}</h2>
          <ul className={listCard}>
            {(pendingRequests ?? []).map((req) => {
              const student = req.student_profiles as { full_name: string } | null;
              const group = req.groups as { name: string } | null;
              const teacher =
                req.teacher_profiles as { profiles: { full_name: string } | null } | null;
              const teacherName =
                (teacher?.profiles as { full_name: string } | null)?.full_name ?? "—";
              return (
                <li key={req.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{student?.full_name ?? "—"}</span>
                      <span className="text-sm text-muted ml-2">
                        ({group?.name ?? "—"})
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {te("requestedBy")}: {teacherName}
                    {req.notes ? <> · {req.notes}</> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("examResults")}</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">{t("noExams")}</p>
        ) : (
          <ul className={listCard}>
            {sessions.map((session) => {
              const student = session.student_profiles as { full_name: string } | null;
              const fromGroup = session.groups as { id: string; name: string } | null;
              const examiner =
                session.teacher_profiles as { profiles: { full_name: string } | null } | null;
              const examinerName =
                (examiner?.profiles as { full_name: string } | null)?.full_name ?? "—";
              return (
                <li key={session.id}>
                  <Link href={`/admin/exams/${session.id}`} className="block p-4 hover:bg-surface transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">
                        {student?.full_name ?? "—"}
                      </span>
                      <span className="text-sm text-muted shrink-0">
                        ({fromGroup?.name ?? "—"})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${statusColor(session.status)}`}
                      >
                        {statusLabel(session.status)}
                      </span>
                      {session.status === "passed" && (
                        <DiplomaPicker
                          sessionId={session.id}
                          label={te("generateDiploma")}
                          basePath="/admin/exams"
                        />
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {session.summary ? (
                    <div className="mt-1 text-sm text-muted truncate">
                      {session.summary}
                    </div>
                  ) : null}
                  <div className="mt-1 text-xs text-muted flex gap-3">
                    <span>
                      {te("date")}: {formatDateShort(session.exam_date, locale)}
                    </span>
                    <span>
                      {t("examsLabel")}: {examinerName}
                    </span>
                    {session.diploma_generated_at && (
                      <span className="text-success-fg">
                        {t("diplomaGenerated")}
                      </span>
                    )}
                  </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
