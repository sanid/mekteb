import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { GraduationCap, CalendarCheck, BookOpen, FileText, BookHeart, Users } from "lucide-react";

import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { HifzProgressMap } from "@/components/HifzProgressMap";
import { formatDate } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

type PageProps = { params: Promise<{ id: string }> };

const STATUS_CLASS: Record<string, string> = {
  present: "bg-success-subtle text-success-fg",
  late: "bg-warning-subtle text-warning-fg",
  absent: "bg-danger-subtle text-danger-fg",
  excused: "bg-info-subtle text-info-fg",
};

export default async function TeacherStudentDetailPage({ params }: PageProps) {
  const locale = await getLocale();
  const { id: studentProfileId } = await params;
  const ctx = await requireTeacher();
  const t = await getTranslations("Teacher");
  const tAdmin = await getTranslations("Admin");

  const hifzMapLabels = {
    title: t("hifzProgress"),
    pages: t("hifzPages"),
    juz: t("hifzJuz"),
    memorized: t("hifzMemorized"),
    complete: t("hifzComplete"),
  };
  const supabase = await createClient();

  // Verify teacher has this student in one of their groups
  const { data: sharedEnrollments } = await supabase
    .from("teacher_group_links")
    .select("group_id, groups(id, name)")
    .eq("teacher_profile_id", ctx.teacherProfileId)
    .eq("is_active", true);

  const teacherGroupIds = (sharedEnrollments ?? []).map((l) => l.group_id);

  if (teacherGroupIds.length === 0) notFound();

  const { data: enrollment } = await supabase
    .from("group_enrollments")
    .select("group_id")
    .eq("student_profile_id", studentProfileId)
    .in("group_id", teacherGroupIds)
    .eq("is_active", true)
    .maybeSingle();

  if (!enrollment) notFound();

  // Fetch student profile
  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, full_name, date_of_birth")
    .eq("id", studentProfileId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!student) notFound();

  const sharedGroupIds = (sharedEnrollments ?? [])
    .filter((l) => {
      // Only groups where this student is enrolled
      return true; // narrowed below
    })
    .map((l) => l.group_id);

  // Fetch shared groups (with category info for hifz detection)
  const { data: studentGroupEnrollments } = await supabase
    .from("group_enrollments")
    .select("group_id, groups(id, name, category_id, group_categories(id, name, is_hifz))")
    .eq("student_profile_id", studentProfileId)
    .in("group_id", sharedGroupIds)
    .eq("is_active", true);

  const sharedGroups = (studentGroupEnrollments ?? []).map((e) => {
    const g = e.groups as { id: string; name: string; category_id: string | null; group_categories: { id: string; name: string; is_hifz: boolean } | null } | null;
    return {
      id: g?.id ?? "",
      name: g?.name ?? "",
      isHifz: g?.group_categories?.is_hifz === true,
    };
  }).filter((g) => g.id);

  const hifzGroupIds = sharedGroups.filter((g) => g.isHifz).map((g) => g.id);
  const { data: hifzProgressRows } = hifzGroupIds.length > 0
    ? await supabase
        .from("hifz_progress")
        .select("group_id, pages_memorized, notes, groups(name)")
        .eq("student_profile_id", studentProfileId)
        .in("group_id", hifzGroupIds)
    : { data: null };

  const [
    { data: attendance },
    { data: progressNotes },
    { data: homework },
    { data: parentLinks },
  ] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("id, status, attendance_sessions(session_date, group_id, groups(name))")
      .eq("student_profile_id", studentProfileId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("progress_notes")
      .select("id, body, visible_to_parents, created_at, groups(name)")
      .eq("student_profile_id", studentProfileId)
      .in("group_id", sharedGroupIds)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("homework_assignments")
      .select("id, title, due_date, is_published, group_id, groups(name)")
      .in("group_id", sharedGroupIds)
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_published", true)
      .order("due_date", { ascending: false })
      .limit(10),
    supabase
      .from("parent_student_links")
      .select("parent_profile_id, parent_profiles(relation, profiles(full_name, display_name, phone))")
      .eq("student_profile_id", studentProfileId),
  ]);

  const presentCount = (attendance ?? []).filter((r) => r.status === "present" || r.status === "late").length;
  const attendanceRate = (attendance ?? []).length > 0
    ? Math.round((presentCount / (attendance ?? []).length) * 100)
    : null;

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<GraduationCap className="h-5 w-5" />}
        title={student.full_name}
        description={student.date_of_birth
          ? formatDate(student.date_of_birth, locale, { year: "numeric", month: "long", day: "numeric" })
          : undefined}
        breadcrumbs={[
          { href: "/teacher", label: t("overview") },
          { label: student.full_name },
        ]}
      />

      {/* Parents — contact details now readable via the teacher branch of
          profiles RLS (see 20260809120000_teacher_reads_parent_contacts). */}
      {(parentLinks ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            {t("parents")}
          </h2>
          <ul className={listCard}>
            {(parentLinks ?? []).map((link) => {
              const pp = link.parent_profiles as {
                relation: string | null;
                profiles: { full_name: string | null; display_name: string | null; phone: string | null } | null;
              } | null;
              const name = pp?.profiles?.display_name || pp?.profiles?.full_name;
              return (
                <li key={link.parent_profile_id} className="px-4 py-3 text-sm space-y-0.5">
                  <div className="font-medium">{name ?? "—"}</div>
                  {pp?.relation ? (
                    <div className="text-xs text-muted">{pp.relation}</div>
                  ) : null}
                  {pp?.profiles?.phone ? (
                    <div className="text-xs text-muted">{tAdmin("phone")}: {pp.profiles.phone}</div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Shared groups */}
      {sharedGroups.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted" />
            {tAdmin("groups")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {sharedGroups.map((g) => (
              <span key={g.id} className="rounded-full bg-accent-subtle text-accent px-3 py-1 text-sm font-medium">
                {g.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Hifz progress */}
      {(hifzProgressRows ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BookHeart className="h-4 w-4 text-success-fg" />
            {t("hifzProgress")}
          </h2>
          <div className="space-y-3">
            {(hifzProgressRows ?? []).map((row) => (
              <HifzProgressMap
                key={row.group_id}
                pagesMemorized={row.pages_memorized}
                groupName={(row.groups as { name: string } | null)?.name}
                notes={row.notes}
                labels={hifzMapLabels}
              />
            ))}
          </div>
        </section>
      )}

      {/* Attendance summary */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-muted" />
          {tAdmin("attendance")} {attendanceRate !== null && <span className="text-sm font-normal text-muted">({attendanceRate}%)</span>}
        </h2>
        {(attendance ?? []).length > 0 ? (
          <ul className={listCard}>
            {(attendance ?? []).map((r) => {
              const session = r.attendance_sessions as { session_date: string; groups: { name: string } | null } | null;
              return (
                <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="font-medium">
                      {session?.session_date ? formatDate(session.session_date, locale, { weekday: "short", month: "short", day: "numeric" }) : "–"}
                    </span>
                    {session?.groups?.name && (
                      <span className="ml-2 text-xs text-muted">{session.groups.name}</span>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[r.status] ?? ""}`}>
                    {tAdmin(r.status as "present" | "absent" | "late" | "excused")}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">{tAdmin("noAttendance")}</p>
        )}
      </section>

      {/* Progress notes */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted" />
          {t("progressNotes")}
        </h2>
        {(progressNotes ?? []).length > 0 ? (
          <ul className={listCard}>
            {(progressNotes ?? []).map((n) => (
              <li key={n.id} className="px-4 py-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">{n.body}</p>
                  {!n.visible_to_parents && (
                    <span className="shrink-0 rounded-full border border-card-border px-2 py-0.5 text-xs text-muted">{t("internalOnly")}</span>
                  )}
                </div>
                <div className="text-xs text-muted flex items-center gap-2">
                  <span>{formatDate(n.created_at, locale, { year: "numeric", month: "short", day: "numeric" })}</span>
                  {(n.groups as { name: string } | null)?.name && (
                    <span>· {(n.groups as { name: string }).name}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("noNotes")}</p>
        )}
      </section>

      {/* Recent homework */}
      {(homework ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted" />
            {t("upcomingHomework")}
          </h2>
          <ul className={listCard}>
            {(homework ?? []).map((h) => (
              <li key={h.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <span>{h.title}</span>
                <span className="text-xs text-muted shrink-0">
                  {h.due_date ? formatDate(h.due_date, locale, { month: "short", day: "numeric" }) : "–"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
