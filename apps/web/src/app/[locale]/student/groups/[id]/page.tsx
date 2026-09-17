import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Users, BookOpen, CalendarDays, FileText, MapPin } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import { listCard } from "@/components/ui/surfaces";

type PageProps = { params: Promise<{ id: string }> };

export default async function StudentGroupDetailPage({ params }: PageProps) {
  const locale = await getLocale();
  const { id: groupId } = await params;
  const ctx = await requireStudent();
  const t = await getTranslations("Student");
  const supabase = await createClient();

  // Verify student is enrolled in this group
  const { data: enrollment } = await supabase
    .from("group_enrollments")
    .select("id, groups(id, name, description, room)")
    .eq("student_profile_id", ctx.studentProfileId)
    .eq("group_id", groupId)
    .eq("is_active", true)
    .maybeSingle();

  if (!enrollment) notFound();

  const group = enrollment.groups as { id: string; name: string; description: string | null; room: string | null } | null;
  if (!group) notFound();

  const [
    { data: teacherLinks },
    { data: classmates },
    { data: upcomingSessions },
    { data: progressNotes },
    { data: weeklyNotes },
  ] = await Promise.all([
    supabase
      .from("teacher_group_links")
      .select("teacher_profiles(id, profiles(full_name, display_name))")
      .eq("group_id", groupId)
      .eq("is_active", true),
    supabase
      .from("group_enrollments")
      .select("student_profiles(full_name)")
      .eq("group_id", groupId)
      .eq("is_active", true),
    supabase
      .from("teaching_sessions")
      .select("id, date, start_time, end_time, is_cancelled, notes")
      .eq("group_id", groupId)
      .eq("mosque_id", ctx.mosqueId)
      .gte("date", new Date().toISOString().slice(0, 10))
      .order("date", { ascending: true })
      .limit(5),
    supabase
      .from("progress_notes")
      .select("id, body, created_at, visible_to_parents")
      .eq("student_profile_id", ctx.studentProfileId)
      .eq("group_id", groupId)
      .eq("visible_to_parents", true)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("teacher_weekly_notes")
      .select("id, week_start, body, is_published")
      .eq("group_id", groupId)
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_published", true)
      .order("week_start", { ascending: false })
      .limit(4),
  ]);

  const teachers = (teacherLinks ?? [])
    .map((l) => {
      const tp = l.teacher_profiles as { profiles: { full_name: string | null; display_name: string | null } | null } | null;
      return tp?.profiles?.display_name ?? tp?.profiles?.full_name ?? null;
    })
    .filter((n): n is string => !!n);

  const classmateNames = (classmates ?? [])
    .map((e) => (e.student_profiles as { full_name: string } | null)?.full_name)
    .filter((n): n is string => !!n && n !== ctx.fullName);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title={
          group.room ? (
            <div className="flex flex-wrap items-center gap-3">
              <span>{group.name}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-card-border px-2.5 py-0.5 text-xs font-medium text-muted whitespace-nowrap">
                <MapPin className="h-3 w-3" />
                {group.room}
              </span>
            </div>
          ) : (
            group.name
          )
        }
        description={group.description ?? undefined}
        breadcrumbs={[
          { href: "/student", label: t("overview") },
          { label: group.name },
        ]}
      />

      {/* Teachers */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted" />
          {t("groupTeachers")}
        </h2>
        {teachers.length > 0 ? (
          <ul className={listCard}>
            {teachers.map((name) => (
              <li key={name} className="px-4 py-3 text-sm">{name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("noTeachersAssigned")}</p>
        )}
      </section>

      {/* Upcoming sessions */}
      {(upcomingSessions ?? []).length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted" />
            {t("upcomingSessions")}
          </h2>
          <ul className={listCard}>
            {(upcomingSessions ?? []).map((s) => (
              <li key={s.id} className={`px-4 py-3 flex items-center justify-between gap-3 text-sm ${s.is_cancelled ? "opacity-60" : ""}`}>
                <div className="space-y-0.5">
                  <div className="font-medium">
                    {formatDate(s.date, locale, { weekday: "long", month: "short", day: "numeric" })}
                  </div>
                  {s.start_time && s.end_time && (
                    <div className="text-xs text-muted">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</div>
                  )}
                  {s.notes && <div className="text-xs text-muted">{s.notes}</div>}
                </div>
                {s.is_cancelled && (
                  <span className="shrink-0 rounded-full bg-danger-subtle px-2 py-0.5 text-xs font-medium text-danger-fg">
                    {t("cancelled")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* My progress notes from teacher */}
      {(progressNotes ?? []).length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted" />
            {t("myProgressNotes")}
          </h2>
          <ul className={listCard}>
            {(progressNotes ?? []).map((n) => (
              <li key={n.id} className="px-4 py-3 space-y-1">
                <p className="text-sm">{n.body}</p>
                <p className="text-xs text-muted">
                  {formatDate(n.created_at, locale, { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Weekly summaries */}
      {(weeklyNotes ?? []).length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("weeklyNotes")}</h2>
          <ul className={listCard}>
            {(weeklyNotes ?? []).map((n) => (
              <li key={n.id} className="px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-muted">
                  {t("weekOf")} {formatDate(n.week_start, locale, { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-sm">{n.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Classmates */}
      {classmateNames.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            {t("classmates")} ({classmateNames.length})
          </h2>
          <ul className={listCard}>
            {classmateNames.map((name) => (
              <li key={name} className="px-4 py-3 text-sm">{name}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
