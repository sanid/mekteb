import { ChevronRight, BookOpen, GraduationCap } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { requireParent } from "@/lib/auth";
import { getMosqueConfig } from "@/lib/mosque-config";
import { createClient } from "@/lib/supabase/server";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { PageHeader } from "@/components/PageHeader";
import { PrayerTimesSection } from "@/components/PrayerTimesSection";
import { emptyCard, listCard } from "@/components/ui/surfaces";
import { formatDate } from "@/lib/format";

const STATUS_DOT: Record<string, string> = {
  present: "bg-success",
  late:    "bg-warning",
  absent:  "bg-danger",
  excused: "bg-info",
};

export default async function ParentDashboard() {
  const ctx = await requireParent();
  const { state: mosqueState } = await getMosqueConfig(ctx.mosqueId);
  const locale = await getLocale();
  const t = await getTranslations("Parent");
  const tAdmin = await getTranslations("Admin");
  const supabase = await createClient();

  const [{ data: links }, { data: branding }] = await Promise.all([
    supabase
      .from("parent_student_links")
      .select("id, student_profile_id, student_profiles(id, full_name, group_enrollments(count))")
      .eq("parent_profile_id", ctx.parentProfileId),
    supabase
      .from("mosque_branding")
      .select("welcome_message, contact_address, contact_phone, contact_email, contact_website")
      .eq("mosque_id", ctx.mosqueId)
      .maybeSingle(),
  ]);

  const children = (links ?? [])
    .map(
      (l) =>
        l.student_profiles as {
          id: string;
          full_name: string;
          group_enrollments: Array<{ count: number }> | null;
        } | null,
    )
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const childIds = children.map((c) => c.id);

  const [{ data: recentAttendance }, { data: confirmedExamsRaw }, { data: childrenEnrollments }] = await Promise.all([
    // Last attendance per child (most recent per student picked in JS)
    childIds.length
    ? supabase
        .from("attendance_records")
        .select("student_profile_id, status, attendance_sessions!inner(session_date)")
        .in("student_profile_id", childIds)
        .order("attendance_sessions.session_date", { ascending: false })
        .limit(childIds.length * 5)
    : { data: [] },
    // Upcoming confirmed exams across all children
    childIds.length
    ? supabase
        .from("exam_sessions")
        .select("id, exam_date, student_profile_id, student_profiles(full_name)")
        .in("student_profile_id", childIds)
        .eq("schedule_status", "confirmed")
        .order("exam_date", { ascending: true })
        .limit(5)
    : { data: [] },
    // Active enrollments, for the calendar categories
    childIds.length
    ? supabase
        .from("group_enrollments")
        .select("id, student_profile_id, groups(id, category_id)")
        .in("student_profile_id", childIds)
        .eq("is_active", true)
    : { data: [] },
  ]);


  // Build a map of studentId → last attendance status
  const lastAttendanceMap = new Map<string, string>();
  for (const rec of recentAttendance ?? []) {
    if (!lastAttendanceMap.has(rec.student_profile_id)) {
      lastAttendanceMap.set(rec.student_profile_id, rec.status);
    }
  }

  const confirmedExams = (confirmedExamsRaw ?? []) as Array<{
    id: string;
    exam_date: string;
    student_profile_id: string;
    student_profiles: { full_name: string } | null;
  }>;


  const parentCategoryIds = (childrenEnrollments ?? [])
    .map((e) => e.groups?.category_id)
    .filter((id): id is string => !!id);

  // Fetch teaching sessions, school holidays and calendar events
  const [{ data: calendarSessions }, { data: holidays }, { data: events }] = await Promise.all([
    parentCategoryIds.length > 0
      ? supabase
          .from("teaching_sessions")
          .select("id, date, start_time, end_time, is_cancelled, notes, category_id, group_id, group_categories(name, color), groups(id, name, room, group_categories(name, color))")
          .eq("mosque_id", ctx.mosqueId)
          .in("category_id", parentCategoryIds)
          .order("date", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from("school_holidays")
      .select("id, name, start_date, end_date")
      .eq("state", mosqueState),
    supabase
      .from("calendar_events")
      .select("id, title, description, date, start_time, end_time, visibility")
      .eq("mosque_id", ctx.mosqueId),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-3">
        <PageHeader title={t("welcome")} description={t("welcomeSub")} />
        {branding?.welcome_message && (
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{branding.welcome_message}</p>
        )}
      </div>

      {(branding?.contact_address || branding?.contact_phone || branding?.contact_email || branding?.contact_website) && (
        <section className="rounded-xl border border-card-border bg-card p-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {branding.contact_address && <span className="text-muted">{branding.contact_address}</span>}
          {branding.contact_phone && <a href={`tel:${branding.contact_phone}`} className="text-accent hover:underline">{branding.contact_phone}</a>}
          {branding.contact_email && <a href={`mailto:${branding.contact_email}`} className="text-accent hover:underline">{branding.contact_email}</a>}
          {branding.contact_website && <a href={branding.contact_website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{branding.contact_website.replace(/^https?:\/\//, "")}</a>}
        </section>
      )}

      <PrayerTimesSection mosqueId={ctx.mosqueId} />

      {confirmedExams.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{t("upcomingExam")}</h2>
          <ul className={listCard}>
            {confirmedExams.map((ex) => (
              <li key={ex.id} className="px-4 py-3 text-sm flex items-center justify-between">
                <span>
                  <strong>{ex.student_profiles?.full_name ?? "—"}</strong> —{" "}
                  {t("examOn")} {formatDate(ex.exam_date, locale, { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("myChildren")}</h2>

        {children.length === 0 ? (
          <div className={`${emptyCard} flex flex-col items-center gap-3`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-muted">
              <GraduationCap className="h-5 w-5" />
            </div>
            <p>{t("noChildrenLinked")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {children.map((c) => {
              const count = c.group_enrollments?.[0]?.count ?? 0;
              const lastStatus = lastAttendanceMap.get(c.id);
              const initials = c.full_name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <Link
                  key={c.id}
                  href={`/parent/children/${c.id}`}
                  className="group rounded-xl border border-card-border bg-card p-5 transition-all hover:border-accent/40 hover:shadow-elevated"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar with last-attendance dot */}
                    <div className="relative shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle text-base font-semibold text-accent">
                        {initials}
                      </div>
                      {lastStatus ? (
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${STATUS_DOT[lastStatus] ?? "bg-muted"}`}
                          title={tAdmin(lastStatus)}
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{c.full_name}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <div className="flex items-center gap-1 text-sm text-muted">
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          <span>{count} {t("groupsCount")}</span>
                        </div>
                        {lastStatus ? (
                          <span className="text-xs text-muted">
                            {t("lastAttendance")}: <span className={
                              lastStatus === "present" ? "text-success-fg" :
                              lastStatus === "absent"  ? "text-danger-fg" :
                              lastStatus === "late"    ? "text-warning-fg" :
                              "text-info-fg"
                            }>{tAdmin(lastStatus)}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <DashboardCalendar
        sessions={calendarSessions ?? []}
        holidays={holidays ?? []}
        events={events ?? []}
      />
    </div>
  );
}
