import { getLocale, getTranslations } from "next-intl/server";

import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AttendanceGrid, type AttendanceDot } from "@/components/AttendanceGrid";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-success-subtle text-success-fg",
  absent:  "bg-danger-subtle text-danger-fg",
  late:    "bg-warning-subtle text-warning-fg",
  excused: "bg-info-subtle text-info-fg",
};

export default async function StudentAttendancePage() {
  const locale = await getLocale();
  const ctx = await requireStudent();
  const t = await getTranslations("Student");
  const supabase = await createClient();

  const { data: records } = await supabase
    .from("attendance_records")
    .select("id, status, note, attendance_sessions(session_date, groups(name))")
    .eq("student_profile_id", ctx.studentProfileId)
    .order("attendance_sessions(session_date)", { ascending: false })
    .limit(90);

  // Full-count stats (the list above is limited to 90 rows).
  const { data: allRecords } = await supabase
    .from("attendance_records")
    .select("status")
    .eq("student_profile_id", ctx.studentProfileId);

  const total = (allRecords ?? []).length;
  const present = (allRecords ?? []).filter((r) => r.status === "present").length;
  const late = (allRecords ?? []).filter((r) => r.status === "late").length;
  const absent = (allRecords ?? []).filter((r) => r.status === "absent").length;
  const excused = (allRecords ?? []).filter((r) => r.status === "excused").length;
  const attended = present + late;
  const rate = total > 0 ? Math.round((attended / total) * 100) : null;

  const dots: AttendanceDot[] = (records ?? [])
    .map((r) => {
      const session = r.attendance_sessions as { session_date: string; groups: { name: string } | null } | null;
      return {
        id: r.id,
        status: r.status,
        date: session?.session_date ?? "",
        groupName: session?.groups?.name,
        note: r.note,
      };
    })
    .filter((d) => d.date);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title={t("attendance")} />

      {total > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{t("attendanceStats")}</span>
          <span className="rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5">
            {t("statsAttended")} {attended}
          </span>
          <span className="rounded-full bg-warning-subtle text-warning-fg px-2.5 py-0.5">
            {t("statsLate")} {late}
          </span>
          <span className="rounded-full bg-danger-subtle text-danger-fg px-2.5 py-0.5">
            {t("statsAbsent")} {absent}
          </span>
          {excused > 0 ? (
            <span className="rounded-full bg-info-subtle text-info-fg px-2.5 py-0.5">
              {t("statsExcused")} {excused}
            </span>
          ) : null}
          <span className="text-xs text-muted">
            {t("statsRate", { rate: rate ?? 0 })}
          </span>
        </div>
      ) : null}

      {dots.length === 0 ? (
        <p className="text-sm text-muted">{t("noAttendance")}</p>
      ) : (
        <>
          <AttendanceGrid dots={dots} locale={locale} />

          {/* Detail list */}
          <ul className={listCard}>
            {(records ?? []).map((r) => {
              const session = r.attendance_sessions as { session_date: string; groups: { name: string } | null } | null;
              return (
                <li key={r.id} className="flex items-center justify-between gap-4 p-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {session?.session_date
                        ? formatDate(session.session_date, locale, { weekday: "short", month: "short", day: "numeric" })
                        : "—"}
                    </div>
                    <div className="text-xs text-muted">{session?.groups?.name}</div>
                    {r.note ? <div className="text-xs text-muted mt-0.5 italic">{r.note}</div> : null}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? "bg-card-border text-muted"}`}>
                    {t(`status_${r.status}` as Parameters<typeof t>[0])}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
