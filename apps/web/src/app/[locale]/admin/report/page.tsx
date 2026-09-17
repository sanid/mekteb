import { getLocale, getTranslations } from "next-intl/server";
import { FileText, Download } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMosqueConfig } from "@/lib/mosque-config";
import { fetchReportData } from "@/lib/report-data";
import { PageHeader } from "@/components/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { EmailReportCardsButton } from "./EmailReportCardsButton";
import { formatDate } from "@/lib/format";

export default async function ReportPage() {
  const ctx = await requireAdmin();
  const t = await getTranslations("Admin");
  const locale = await getLocale();
  const supabase = await createClient();

  const { schoolYearStart: since } = await getMosqueConfig(ctx.mosqueId);
  const data = await fetchReportData(ctx.mosqueId, since);

  const { data: branding } = await supabase
    .from("mosque_branding")
    .select("primary_color")
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title={t("annualReport")}
        description={t("reportDesc")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("annualReport") },
        ]}
      />

      <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted">{t("reportPeriod")}</p>
            <p className="text-sm">
              {formatDate(since, locale, { day: "numeric", month: "long", year: "numeric" })} — {formatDate(new Date(), locale, { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <EmailReportCardsButton
              labels={{
                send: t("emailReportCards"),
                sending: t("emailReportCardsSending"),
                done: t("emailReportCardsDone"),
                emailed: t("emailReportCardsEmailed"),
                skipped: t("emailReportCardsSkipped"),
              }}
            />
            <a
              href="/admin/report/pdf"
              target="_blank"
              className={buttonVariants({ size: "xl" })}
            >
              <Download className="h-4 w-4" />
              {t("downloadPdf")}
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("reportTotalStudents")}</p>
          <p className="text-3xl font-semibold tracking-tight">{data.totalStudents}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("reportTotalGroups")}</p>
          <p className="text-3xl font-semibold tracking-tight">{data.totalGroups}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("reportTotalTeachers")}</p>
          <p className="text-3xl font-semibold tracking-tight">{data.totalTeachers}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("reportStudentsOverHalf")}</p>
          <p className="text-3xl font-semibold tracking-tight text-accent">{data.studentsAttendedOverHalf}</p>
          <p className="text-xs text-muted">{t("reportOutOf", { total: data.totalStudents })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("attendanceRateYear")}</p>
          {data.overallAttendanceRate !== null ? (
            <>
              <p className="text-3xl font-semibold tracking-tight text-accent">{data.overallAttendanceRate}%</p>
              <div className="h-2 rounded-full bg-card-border/60 overflow-hidden">
                <div className="h-full rounded-full bg-accent" style={{ width: `${data.overallAttendanceRate}%` }} />
              </div>
              <p className="text-xs text-muted">{data.overallAttPresent} / {data.overallAttTotal}</p>
            </>
          ) : <p className="text-sm text-muted">{t("noDataYet")}</p>}
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("examPassRateYear")}</p>
          {data.overallExamPassRate !== null ? (
            <>
              <p className="text-3xl font-semibold tracking-tight text-accent">{data.overallExamPassRate}%</p>
              <div className="h-2 rounded-full bg-card-border/60 overflow-hidden">
                <div className="h-full rounded-full bg-accent" style={{ width: `${data.overallExamPassRate}%` }} />
              </div>
              <p className="text-xs text-muted">{data.examPassed} {t("examPassed")} / {data.examPassed + data.examFailed} {t("examTotal")}</p>
            </>
          ) : <p className="text-sm text-muted">{t("noDataYet")}</p>}
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("lessonCompletionYear")}</p>
          {data.overallLessonRate !== null ? (
            <>
              <p className="text-3xl font-semibold tracking-tight text-accent">{data.overallLessonRate}%</p>
              <div className="h-2 rounded-full bg-card-border/60 overflow-hidden">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(data.overallLessonRate, 100)}%` }} />
              </div>
            </>
          ) : <p className="text-sm text-muted">{t("noDataYet")}</p>}
        </div>
      </div>

      {data.groups.length > 0 && (
        <div className="rounded-xl border border-card-border overflow-hidden">
          <div className="px-5 py-4 border-b border-card-border bg-surface">
            <h3 className="text-sm font-semibold">{t("reportGroupProgress")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border bg-surface/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{t("groups")}</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted">{t("students")}</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted">{t("attendance")}</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted">{t("lessonProgress")}</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted">{t("examsLabel")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {data.groups.map((g, i) => (
                  <tr key={g.id} className={i === 0 ? "bg-accent-subtle/50" : ""}>
                    <td className="px-4 py-2.5 font-medium">
                      {i === 0 && <span className="text-accent mr-1">★</span>}
                      {g.name}
                    </td>
                    <td className="text-center px-3 py-2.5">{g.studentCount}</td>
                    <td className="text-center px-3 py-2.5">{g.attendanceRate ?? "—"}%</td>
                    <td className="text-center px-3 py-2.5">{g.lessonRate ?? "—"}%</td>
                    <td className="text-center px-3 py-2.5">
                      {g.examPassRate !== null ? `${g.examPassRate}%` : "—"}
                      <span className="text-xs text-muted ml-1">({g.examPassed}✓ {g.examFailed}✗)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.topStudents.length > 0 && (
        <div className="rounded-xl border border-card-border overflow-hidden">
          <div className="px-5 py-4 border-b border-card-border bg-surface">
            <h3 className="text-sm font-semibold">{t("reportTopStudents")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border bg-surface/50">
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted w-10">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">{t("students")}</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted">{t("attendance")}</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted">{t("lessonProgress")}</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted">{t("examsLabel")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {data.topStudents.map((s, i) => (
                  <tr key={s.id} className={i < 3 ? "bg-accent-subtle/50" : ""}>
                    <td className="text-center px-3 py-2.5">
                      <span className={`inline-flex items-center justify-center rounded-full text-xs font-semibold ${i < 3 ? "bg-accent text-primary-foreground h-6 w-6" : "text-muted"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{s.fullName}</td>
                    <td className="text-center px-3 py-2.5">{s.attendanceRate ?? "—"}%</td>
                    <td className="text-center px-3 py-2.5">{s.lessonCompletionRate ?? "—"}%</td>
                    <td className="text-center px-3 py-2.5">
                      <span className="text-success-fg">{s.examsPassed}✓</span>
                      {s.examsFailed > 0 && <span className="text-danger-fg ml-1">{s.examsFailed}✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
