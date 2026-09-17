"use client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getTranslatedRelation } from "@/lib/relations";
import {
  Users,
  GraduationCap,
  BookOpen,
  Heart,
  TrendingUp,
  CheckSquare,
  Plus,
  ChevronRight,
  ChevronDown,
  Search,
  SendHorizontal,
  Download,
} from "lucide-react";
import {
  groups,
  students,
  teachers,
  parents,
  lessons,
  topics,
  homeworkAssignments,
  announcements,
  messageThreads,
  notifications,
  auditLogs,
  lessonCompletions,
  examSessions,
  examRequests,
  examQuestions,
  gdprRequests,
  reportData,
  loginAuditLogs,
  otpIssues,
  passwordResets,
  getStudentsInGroup,
  getParentsForStudent,
  getAttendanceForGroup,
  getHomeworkForGroup,
  getGroupsForStudent,
  getGroupsForTeacher,
  type DemoView,
} from "@/lib/demo-data";

import { DemoWeekCalendar } from "./DemoWeekCalendar";

function PageHeader({
  title,
  breadcrumbs,
}: {
  title: string;
  breadcrumbs: { label: string; onClick?: () => void }[];
}) {
  return (
    <div className="space-y-2 border-b border-card-border pb-5">
      <nav>
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
          {breadcrumbs.map((b, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <li key={i} className="flex items-center gap-1">
                {b.onClick && !isLast ? (
                  <button
                    onClick={b.onClick}
                    className="hover:text-foreground transition-colors"
                  >
                    {b.label}
                  </button>
                ) : (
                  <span className={isLast ? "text-foreground" : ""}>
                    {b.label}
                  </span>
                )}
                {!isLast && <ChevronRight className="h-3 w-3" />}
              </li>
            );
          })}
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight truncate">
        {title}
      </h1>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20";

export function AdminOverview({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");

  const statCards = [
    { label: t("groups"), value: groups.length, Icon: BookOpen, bg: "bg-accent-subtle", fg: "text-accent", page: "groups" as const },
    { label: t("students"), value: students.filter((s) => s.isActive).length + students.filter((s) => !s.isActive).length, Icon: GraduationCap, bg: "bg-accent-subtle", fg: "text-accent", page: "students" as const },
    { label: t("teachers"), value: teachers.length, Icon: Users, bg: "bg-accent-subtle", fg: "text-accent", page: "teachers" as const },
    { label: t("parents"), value: parents.length, Icon: Heart, bg: "bg-accent-subtle", fg: "text-accent", page: "parents" as const },
  ];

  const quickActions = [
    { label: t("addTeacher"), Icon: Users, page: "teachers" as const },
    { label: t("addParent"), Icon: Heart, page: "parents" as const },
    { label: t("addStudent"), Icon: GraduationCap, page: "students" as const },
    { label: t("addGroup"), Icon: BookOpen, page: "groups" as const },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">{t("overview")}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <button
            key={s.label}
            onClick={() => onNavigate({ page: s.page })}
            className="group rounded-xl border border-card-border bg-card p-5 text-left transition-all hover:border-accent/40 hover:shadow-elevated"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted truncate">{s.label}</p>
                <p className="mt-1.5 text-3xl font-bold tracking-tight">{s.value}</p>
              </div>
              <div className={`shrink-0 rounded-lg p-2 ${s.bg}`}>
                <s.Icon className={`h-4 w-4 ${s.fg}`} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide">{t("quickActions")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => onNavigate({ page: a.page })}
              className="flex items-center gap-2 rounded-xl border border-card-border bg-card px-4 py-3 text-sm font-medium transition-all hover:border-accent/40 hover:bg-accent-subtle hover:text-accent opacity-50 cursor-not-allowed"
              disabled
            >
              <Plus className="h-4 w-4 shrink-0" />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-accent-subtle p-1.5">
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm font-medium text-muted">{t("attendanceRate30d")}</p>
          </div>
          <p className="text-3xl font-bold tracking-tight text-accent">87%</p>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
              <div className="h-full rounded-full bg-accent" style={{ width: "87%" }} />
            </div>
            <p className="text-xs text-muted">20 / 23 {t("recordsPresent")}</p>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-accent-subtle p-1.5">
              <CheckSquare className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm font-medium text-muted">{t("homeworkAckRate")}</p>
          </div>
          <p className="text-3xl font-bold tracking-tight text-accent">72%</p>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
              <div className="h-full rounded-full bg-accent" style={{ width: "72%" }} />
            </div>
            <p className="text-xs text-muted">5 {t("acknowledgements")} / 7 {t("assignments")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminGroups({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("groups")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("groups") }]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {groups.map((g) => {
          const groupTeachers = g.teacherIds
            .map((tid) => teachers.find((t2) => t2.id === tid))
            .filter(Boolean);
          const studentCount = g.studentIds.length;
          return (
            <li key={g.id}>
              <button
                onClick={() => onNavigate({ page: "group-detail", id: g.id })}
                className="block w-full text-left p-4 transition-colors hover:bg-accent-subtle"
              >
                <div className="font-medium">{g.name}</div>
                {g.description ? (
                  <div className="text-sm text-muted">{g.description}</div>
                ) : null}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                  <span>{studentCount} {t("students").toLowerCase()}</span>
                  {groupTeachers.length > 0 && (
                    <span>{groupTeachers.map((t2) => t2!.displayName).join(", ")}</span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
        {groups.length === 0 && (
          <li className="p-4 text-sm text-muted">{t("noGroups")}</li>
        )}
      </ul>
    </div>
  );
}

export function AdminGroupDetail({
  groupId,
  onNavigate,
}: {
  groupId: string;
  onNavigate: (v: DemoView) => void;
}) {
  const t = useTranslations("Admin");
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;

  const groupStudents = getStudentsInGroup(groupId);
  const groupTeachers = group.teacherIds
    .map((tid) => teachers.find((t2) => t2.id === tid))
    .filter(Boolean);
  const groupHomework = getHomeworkForGroup(groupId);
  const groupAttendance = getAttendanceForGroup(groupId);

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title={group.name}
        breadcrumbs={[
          { label: t("overview"), onClick: () => onNavigate({ page: "overview" }) },
          { label: t("groups"), onClick: () => onNavigate({ page: "groups" }) },
          { label: group.name },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("roster")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {groupStudents.map((s) => (
            <li key={s.id} className="flex items-center justify-between p-4">
              <span className="font-medium">{s.fullName}</span>
            </li>
          ))}
          {groupStudents.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noStudentsEnrolled")}</li>
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("teachers")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {groupTeachers.map((t2) => (
            <li key={t2!.id} className="p-4">
              <span className="font-medium">{t2!.fullName}</span>
            </li>
          ))}
          {groupTeachers.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noTeachersAssigned")}</li>
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("homework")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {groupHomework.map((h) => (
            <li key={h.id} className="p-4 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{h.title}</span>
                <span
                  className={`text-xs rounded-full px-2.5 py-0.5 ${
                    h.audience === "group"
                      ? "bg-info-subtle text-info-fg"
                      : "bg-warning-subtle text-warning-fg"
                  }`}
                >
                  {h.audience === "group" ? t("wholeGroup") : t("specificStudents")}
                </span>
                {h.dueDate && (
                  <span className="text-xs text-muted">
                    {t("due")} {h.dueDate}
                  </span>
                )}
              </div>
              {h.body && <div className="text-sm text-muted">{h.body}</div>}
            </li>
          ))}
          {groupHomework.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noHomework")}</li>
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("attendance")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {groupAttendance.map((s) => {
            const presentCount = s.records.filter(
              (r) => r.status === "present" || r.status === "late"
            ).length;
            const absentCount = s.records.filter((r) => r.status === "absent").length;
            const excusedCount = s.records.filter((r) => r.status === "excused").length;
            return (
              <li key={s.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {new Date(s.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs">
                      {presentCount > 0 && (
                        <span className="rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5 font-semibold">
                          {presentCount} {t("present")}
                        </span>
                      )}
                      {absentCount > 0 && (
                        <span className="rounded-full bg-danger-subtle text-danger-fg px-2.5 py-0.5 font-semibold">
                          {absentCount} {t("absent")}
                        </span>
                      )}
                      {excusedCount > 0 && (
                        <span className="rounded-full bg-info-subtle text-info-fg px-2.5 py-0.5 font-semibold">
                          {excusedCount} {t("excused")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-card-border overflow-hidden divide-y divide-card-border text-sm">
                  {s.records.map((r) => {
                    const statusCls =
                      r.status === "present"
                        ? "bg-success-subtle text-success-fg"
                        : r.status === "late"
                          ? "bg-warning-subtle text-warning-fg"
                          : r.status === "absent"
                            ? "bg-danger-subtle text-danger-fg"
                            : "bg-info-subtle text-info-fg";
                    return (
                      <div
                        key={r.studentId}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <span className="font-medium">{r.studentName}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusCls}`}
                        >
                          {r.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
          {groupAttendance.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noAttendance")}</li>
          )}
        </ul>
      </section>
    </div>
  );
}

export function AdminStudents({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("students")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("students") }]}
      />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          disabled
          placeholder={t("search")}
          className="w-full rounded-lg border border-card-border bg-background pl-9 pr-3 py-2 text-sm opacity-50 cursor-not-allowed"
        />
      </div>
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {students.map((s) => {
          const studentGroups = getGroupsForStudent(s.id);
          const studentParents = getParentsForStudent(s.id);
          return (
            <li key={s.id}>
              <button
                onClick={() => onNavigate({ page: "student-detail", id: s.id })}
                className="block w-full text-left p-4 space-y-1 transition-colors hover:bg-accent-subtle"
              >
                <div className="flex justify-between">
                  <div className="font-medium">{s.fullName}</div>
                  {s.dob && <div className="text-sm text-muted">{s.dob}</div>}
                </div>
                <div className="text-sm text-muted">
                  {studentGroups.length} {t("groups").toLowerCase()}
                  {studentParents.length > 0 &&
                    ` — ${studentParents.map((p) => p.fullName).join(", ")}`}
                </div>
              </button>
            </li>
          );
        })}
        {students.length === 0 && (
          <li className="p-4 text-sm text-muted">{t("noStudents")}</li>
        )}
      </ul>
    </div>
  );
}

export function AdminStudentDetail({
  studentId,
  onNavigate,
}: {
  studentId: string;
  onNavigate: (v: DemoView) => void;
}) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const student = students.find((s) => s.id === studentId);
  if (!student) return null;

  const studentGroups = getGroupsForStudent(studentId);
  const studentParents = getParentsForStudent(studentId);
  const completed = lessonCompletions[studentId] ?? [];
  const completedSet = new Set(completed);

  const studentHomework = homeworkAssignments.filter((h) =>
    studentGroups.some((g) => g.id === h.groupId)
  );

  const allLessonsForStudent = lessons.map((l) => ({
    ...l,
    completed: completedSet.has(l.id),
  }));
  const totalLessons = allLessonsForStudent.length;
  const doneLessons = allLessonsForStudent.filter((l) => l.completed).length;
  const pct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title={student.fullName}
        breadcrumbs={[
          { label: t("overview"), onClick: () => onNavigate({ page: "overview" }) },
          { label: t("students"), onClick: () => onNavigate({ page: "students" }) },
          { label: student.fullName },
        ]}
      />

      {student.dob && (
        <p className="text-sm text-muted">
          {t("dateOfBirthOpt").replace(/ \(.*\)$/, "")}: {student.dob}
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-base font-semibold tracking-tight">{t("enrolledGroups")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {studentGroups.map((g) => (
            <li key={g.id} className="p-4">
              <button
                onClick={() => onNavigate({ page: "group-detail", id: g.id })}
                className="font-medium hover:text-accent transition-colors"
              >
                {g.name}
              </button>
            </li>
          ))}
          {studentGroups.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noGroupsEnrolled")}</li>
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("lessonProgress")}</h2>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {doneLessons} / {totalLessons} {t("lessonsCompleted")}
            </span>
            <span className="text-muted">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-card-border overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {topics.map((tp) => {
            const tpLessons = allLessonsForStudent.filter((l) => l.topicId === tp.id);
            if (tpLessons.length === 0) return null;
            const tpDone = tpLessons.filter((l) => l.completed).length;
            return (
              <div key={tp.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{tp.title}</span>
                  <span className="text-muted">
                    {tpDone}/{tpLessons.length}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {tpLessons.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center gap-2 text-sm py-1 px-1 rounded"
                    >
                      <span
                        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
                          l.completed
                            ? "bg-accent border-accent text-primary-foreground"
                            : "border-card-border bg-background"
                        }`}
                      >
                        {l.completed && (
                          <svg
                            viewBox="0 0 12 12"
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </span>
                      <span className={l.completed ? "line-through text-muted" : ""}>
                        {l.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("homework")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {studentHomework.map((h) => {
            const isOverdue = h.dueDate && new Date(h.dueDate) < new Date();
            return (
              <li key={h.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{h.title}</span>
                  {h.dueDate && (
                    <span
                      className={`text-xs shrink-0 ${isOverdue ? "text-danger-fg" : "text-muted"}`}
                    >
                      {t("due")}: {new Date(h.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted">{h.groupName}</div>
              </li>
            );
          })}
          {studentHomework.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noHomework")}</li>
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("linkedParents")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {studentParents.map((p) => (
            <li key={p.id} className="p-4">
              <div className="font-medium">{p.fullName}</div>
              <div className="text-sm text-muted">{getTranslatedRelation(p.relation, locale)}</div>
            </li>
          ))}
          {studentParents.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noParents")}</li>
          )}
        </ul>
      </section>
    </div>
  );
}

export function AdminTeachers({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("teachers")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("teachers") }]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {teachers.map((t2) => {
          const teacherGroups = getGroupsForTeacher(t2.id);
          return (
            <li key={t2.id}>
              <button
                onClick={() => onNavigate({ page: "teacher-detail", id: t2.id })}
                className="block w-full text-left p-4 space-y-1 transition-colors hover:bg-accent-subtle"
              >
                <div className="font-medium">{t2.fullName}</div>
                {t2.bio && <div className="text-sm text-muted">{t2.bio}</div>}
                {teacherGroups.length > 0 && (
                  <div className="text-xs text-muted">
                    {teacherGroups.map((g) => g.name).join(", ")}
                  </div>
                )}
              </button>
            </li>
          );
        })}
        {teachers.length === 0 && (
          <li className="p-4 text-sm text-muted">{t("noTeachers")}</li>
        )}
      </ul>
    </div>
  );
}

export function AdminTeacherDetail({
  teacherId,
  onNavigate,
}: {
  teacherId: string;
  onNavigate: (v: DemoView) => void;
}) {
  const t = useTranslations("Admin");
  const teacher = teachers.find((t2) => t2.id === teacherId);
  if (!teacher) return null;

  const teacherGroups = getGroupsForTeacher(teacherId);

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title={teacher.fullName}
        breadcrumbs={[
          { label: t("overview"), onClick: () => onNavigate({ page: "overview" }) },
          { label: t("teachers"), onClick: () => onNavigate({ page: "teachers" }) },
          { label: teacher.fullName },
        ]}
      />

      {!teacher.isActive && (
        <span className="inline-block text-xs rounded-full bg-warning-subtle px-2.5 py-0.5 text-warning-fg">
          {t("inactive")}
        </span>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("editProfile")}</h2>
        <div className="space-y-4 rounded-xl border border-card-border bg-card p-6 opacity-50 pointer-events-none">
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("fullName")}</span>
            <input defaultValue={teacher.fullName} className={inputCls} disabled />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("displayNameOpt")}</span>
            <input defaultValue={teacher.displayName} className={inputCls} disabled />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("phone")}</span>
            <input defaultValue={teacher.phone ?? ""} className={inputCls} disabled />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("bioOpt")}</span>
            <textarea defaultValue={teacher.bio ?? ""} rows={3} className={inputCls} disabled />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("groups")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {teacherGroups.map((g) => (
            <li key={g.id} className="p-4">
              <button
                onClick={() => onNavigate({ page: "group-detail", id: g.id })}
                className="font-medium hover:text-accent transition-colors"
              >
                {g.name}
              </button>
            </li>
          ))}
          {teacherGroups.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noGroups")}</li>
          )}
        </ul>
      </section>
    </div>
  );
}

export function AdminParents({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");
  const locale = useLocale();

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("parents")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("parents") }]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {parents.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => onNavigate({ page: "parent-detail", id: p.id })}
              className="block w-full text-left p-4 space-y-1 transition-colors hover:bg-accent-subtle"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.fullName}</span>
                <span className="text-xs text-muted">{getTranslatedRelation(p.relation, locale)}</span>
              </div>
              {p.children.length > 0 && (
                <div className="text-sm text-muted">{p.children.join(", ")}</div>
              )}
            </button>
          </li>
        ))}
        {parents.length === 0 && (
          <li className="p-4 text-sm text-muted">{t("noParents")}</li>
        )}
      </ul>
    </div>
  );
}

export function AdminParentDetail({
  parentId,
  onNavigate,
}: {
  parentId: string;
  onNavigate: (v: DemoView) => void;
}) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const parent = parents.find((p) => p.id === parentId);
  if (!parent) return null;

  const linkedChildren = parent.children
    .map((name) => students.find((s) => s.fullName === name))
    .filter(Boolean);

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title={parent.fullName}
        breadcrumbs={[
          { label: t("overview"), onClick: () => onNavigate({ page: "overview" }) },
          { label: t("parents"), onClick: () => onNavigate({ page: "parents" }) },
          { label: parent.fullName },
        ]}
      />

      {!parent.isActive && (
        <span className="inline-block text-xs rounded-full bg-warning-subtle px-2.5 py-0.5 text-warning-fg">
          {t("inactive")}
        </span>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("editProfile")}</h2>
        <div className="space-y-4 rounded-xl border border-card-border bg-card p-6 opacity-50 pointer-events-none">
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("fullName")}</span>
            <input defaultValue={parent.fullName} className={inputCls} disabled />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("relation")}</span>
            <input defaultValue={parent.relation ? getTranslatedRelation(parent.relation, locale) : ""} className={inputCls} disabled />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("linkedChildren")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {linkedChildren.map((child) => (
            <li key={child!.id} className="p-4">
              <button
                onClick={() => onNavigate({ page: "student-detail", id: child!.id })}
                className="font-medium hover:text-accent transition-colors"
              >
                {child!.fullName}
              </button>
            </li>
          ))}
          {linkedChildren.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noChildrenLinked")}</li>
          )}
        </ul>
      </section>
    </div>
  );
}

export function AdminLessons({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(topics.map((tp) => tp.id)));

  function toggleTopic(tpId: string) {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(tpId)) next.delete(tpId);
      else next.add(tpId);
      return next;
    });
  }

  const lessonsByTopic = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const list = lessonsByTopic.get(l.topicId) ?? [];
    list.push(l);
    lessonsByTopic.set(l.topicId, list);
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("lessonLibrary")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("lessonLibrary") }]}
      />
      <div className="space-y-3">
        {topics.map((tp) => {
          const tpLessons = lessonsByTopic.get(tp.id) ?? [];
          const isExpanded = expandedTopics.has(tp.id);
          return (
            <div
              key={tp.id}
              className="rounded-xl border border-card-border overflow-hidden"
            >
              <button
                onClick={() => toggleTopic(tp.id)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-accent-subtle"
              >
                <div>
                  <div className="font-medium">{tp.title}</div>
                  <div className="text-xs text-muted">
                    {tpLessons.length} {tpLessons.length === 1 ? t("lessonSingular") : t("lessons").toLowerCase()}
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>
              {isExpanded && tpLessons.length > 0 && (
                <ul className="border-t border-card-border divide-y divide-card-border">
                  {tpLessons.map((l) => (
                    <li key={l.id} className="px-4 py-3">
                      <div className="font-medium text-sm">{l.title}</div>
                      {l.body && <div className="text-xs text-muted mt-0.5">{l.body}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {topics.length === 0 && (
          <p className="rounded-xl border border-card-border p-4 text-sm text-muted">
            {t("noTopics")}
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminAnnouncements({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("announcements")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("announcements") }]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {announcements.map((a) => (
          <li key={a.id} className="p-4 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{a.title}</div>
              <span className="shrink-0 text-xs text-muted bg-card-border rounded px-1.5 py-0.5">
                {a.audience === "mosque" ? t("mosqueWide") : a.groupName}
              </span>
            </div>
            <p className="text-sm text-muted whitespace-pre-line">{a.body}</p>
            <span className="text-xs text-muted">
              {new Date(a.publishedAt).toLocaleDateString()}
            </span>
          </li>
        ))}
        {announcements.length === 0 && (
          <li className="p-4 text-sm text-muted">{t("noAnnouncements")}</li>
        )}
      </ul>
    </div>
  );
}

export function AdminMessages({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Messaging");
  const tAdmin = useTranslations("Admin");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  if (selectedThread) {
    const thread = messageThreads.find((mt) => mt.id === selectedThread);
    if (!thread) return null;
    const otherNames = thread.participants
      .filter((p) => p.profileId !== "admin")
      .map((p) => p.name)
      .join(", ");

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-card-border bg-background">
          <button
            onClick={() => setSelectedThread(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-accent-subtle hover:text-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-semibold">
            {(otherNames[0] ?? "—").toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{otherNames}</div>
            {thread.subject && (
              <div className="text-xs text-muted truncate">{thread.subject}</div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {thread.messages.map((m) => {
            const isMe = m.authorProfileId === "admin";
            return (
              <div
                key={m.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}
              >
                <div
                  className={`max-w-[78%] rounded-xl px-3.5 py-2 ${
                    isMe
                      ? "bg-accent text-primary-foreground rounded-br-sm"
                      : "bg-card border border-card-border rounded-bl-sm"
                  }`}
                >
                  {!isMe && (
                    <div className="text-[11px] font-semibold opacity-60 mb-0.5 leading-none">
                      {m.authorName}
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {m.body}
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 ${isMe ? "text-white/50" : "text-muted"} text-right leading-none`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="shrink-0 border-t border-card-border bg-background px-3 py-2">
          <div className="flex gap-2 items-end">
            <textarea
              disabled
              rows={1}
              placeholder={t("typeMessage")}
              className="flex-1 resize-none rounded-xl border border-card-border bg-surface px-3.5 py-2 text-sm opacity-50 cursor-not-allowed"
            />
            <button
              disabled
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary-foreground opacity-50 cursor-not-allowed"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={tAdmin("messages")}
        breadcrumbs={[{ label: tAdmin("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: tAdmin("messages") }]}
      />
      <ul className="divide-y divide-card-border/50 rounded-xl border border-card-border overflow-hidden">
        {messageThreads.map((thread) => {
          const others = thread.participants.filter((p) => p.profileId !== "admin");
          const otherNames = others.map((p) => p.name).join(", ") || "?";
          const lastMsg = thread.messages[thread.messages.length - 1];
          return (
            <li key={thread.id}>
              <button
                onClick={() => setSelectedThread(thread.id)}
                className="flex items-start gap-3 px-4 py-3 w-full text-left hover:bg-accent-subtle transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-semibold mt-0.5">
                  {(otherNames[0] ?? "—").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1.5">
                    <span className="text-sm truncate font-medium text-foreground/80">
                      {otherNames}
                    </span>
                    <span className="text-[10px] text-muted shrink-0 tabular-nums">
                      {new Date(thread.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted truncate leading-relaxed">
                      {lastMsg?.body ?? ""}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
        {messageThreads.length === 0 && (
          <li className="p-4 text-sm text-muted text-center">{t("noMessages")}</li>
        )}
      </ul>
    </div>
  );
}

export function AdminNotifications({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Notifications");
  const tAdmin = useTranslations("Admin");

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title={t("notifications")}
        breadcrumbs={[{ label: tAdmin("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("notifications") }]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {notifications.map((n) => (
          <li key={n.id} className="p-4 space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-sm">{n.subject ?? t("noSubject")}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted">{n.channel}</span>
                <span
                  className={`text-xs rounded-full px-2 py-0.5 ${
                    n.status === "sent"
                      ? "bg-success-subtle text-success-fg"
                      : n.status === "failed"
                        ? "bg-danger-subtle text-danger-fg"
                        : "bg-warning-subtle text-warning-fg"
                  }`}
                >
                  {n.status}
                </span>
              </div>
            </div>
            <div className="text-sm text-muted">{n.body}</div>
            <div className="text-xs text-muted">
              {new Date(n.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
        {notifications.length === 0 && (
          <li className="p-4 text-sm text-muted">{t("noNotifications")}</li>
        )}
      </ul>
    </div>
  );
}

export function AdminAudit({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("auditLog")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("auditLog") }]}
      />
      <div className="rounded-xl border border-card-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-card-border">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("auditWhen")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("auditAction")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("auditActor")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("auditTarget")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("auditMeta")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-card transition-colors">
                <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  <span className="rounded bg-accent-subtle text-accent px-1.5 py-0.5">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3">{log.actor}</td>
                <td className="px-4 py-3 text-muted text-xs">{log.target}</td>
                <td className="px-4 py-3 text-muted text-xs font-mono max-w-xs truncate">
                  {log.metadata}
                </td>
              </tr>
            ))}
            {auditLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                  {t("noAuditLogs")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSettings({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");

  const LOCALES = ["de", "en", "bs", "tr"] as const;
  const TIMEZONES = [
    "Europe/Berlin",
    "Europe/Vienna",
    "Europe/Zurich",
    "Europe/London",
    "Europe/Istanbul",
    "Europe/Sarajevo",
    "America/New_York",
    "America/Chicago",
    "America/Los_Angeles",
    "Asia/Dubai",
    "Asia/Riyadh",
    "Africa/Cairo",
  ] as const;

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title={t("settings")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("settings") }]}
      />
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("mosqueInfo")}</h2>
        <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-4 opacity-50 pointer-events-none">
          <label className="block">
            <span className="text-sm font-medium">{t("mosqueName")}</span>
            <input defaultValue="Demo-Moschee" className={`mt-1 block ${inputCls}`} disabled />
          </label>
          <div className="text-xs text-muted font-mono">
            {t("slug")}: demo-mosque
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">{t("locale")}</span>
              <select defaultValue="en" className={`mt-1 block ${inputCls}`} disabled>
                {LOCALES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t("timezone")}</span>
              <select defaultValue="Europe/Sarajevo" className={`mt-1 block ${inputCls}`} disabled>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            disabled
            className={cn(buttonVariants({ size: "xl" }), "self-start opacity-50 cursor-not-allowed")}
          >
            {t("save")}
          </button>
        </div>
      </section>
    </div>
  );
}

export function AdminCalendar({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("calendar")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("calendar") }]}
      />

      {/* The real week calendar, with demo data — the admin sees every group
          in both scopes. */}
      <DemoWeekCalendar />
    </div>
  );
}

export function AdminExams({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");
  const te = useTranslations("Examiner");

  const total = examSessions.length;
  const passed = examSessions.filter((s) => s.status === "passed").length;
  const failed = examSessions.filter((s) => s.status === "failed").length;
  const passRate = total > 0 ? Math.round((passed / (passed + failed)) * 100) : 0;

  const statusColor = (status: string) => {
    switch (status) {
      case "passed": return "bg-success-subtle text-success-fg";
      case "failed": return "bg-danger-subtle text-danger-fg";
      case "in_progress": return "bg-warning-subtle text-warning-fg";
      case "scheduled": return "bg-accent-subtle text-accent";
      default: return "bg-info-subtle text-info-fg";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "passed": return te("passed");
      case "failed": return te("failed");
      case "in_progress": return te("examStatus_in_progress");
      case "scheduled": return te("examStatus_scheduled");
      default: return status;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("exams")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("exams") }]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-card-border p-4">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-muted">{t("examTotal")}</div>
        </div>
        <div className="rounded-xl border border-card-border p-4">
          <div className="text-2xl font-bold text-success-fg">{passed}</div>
          <div className="text-xs text-muted">{t("examPassed")}</div>
        </div>
        <div className="rounded-xl border border-card-border p-4">
          <div className="text-2xl font-bold text-danger-fg">{failed}</div>
          <div className="text-xs text-muted">{t("examFailed")}</div>
        </div>
        <div className="rounded-xl border border-card-border p-4">
          <div className="text-2xl font-bold">{passRate}%</div>
          <div className="text-xs text-muted">{t("examPassRateYear")}</div>
        </div>
      </div>

      {examRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{te("pendingRequests")}</h2>
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
            {examRequests.map((req) => (
              <li key={req.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{req.studentName}</span>
                    <span className="text-sm text-muted ml-2">({req.groupName})</span>
                  </div>
                </div>
                <div className="text-xs text-muted mt-1">
                  {te("requestedBy")}: {req.teacherName}
                  {req.notes ? <> · {req.notes}</> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("examResults")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {examSessions.map((session) => (
            <li key={session.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{session.studentName}</span>
                  <span className="text-sm text-muted shrink-0">({session.groupName})</span>
                </div>
                <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium shrink-0 ${statusColor(session.status)}`}>
                  {statusLabel(session.status)}
                </span>
              </div>
              {session.summary ? (
                <div className="mt-1 text-sm text-muted truncate">{session.summary}</div>
              ) : null}
              <div className="mt-1 text-xs text-muted flex gap-3">
                <span>{te("date")}: {session.examDate}</span>
                <span>{t("examsLabel")}: {session.examinerName}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function AdminReport({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");
  const d = reportData;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={t("annualReport")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("annualReport") }]}
      />

      <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted">{t("reportPeriod")}</p>
            <p className="text-sm">
              {new Date(d.periodStart).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })} — {new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <button
            disabled
            className={cn(buttonVariants({ size: "xl" }), "opacity-50 cursor-not-allowed")}
          >
            <Download className="h-4 w-4" />
            {t("downloadPdf")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("reportTotalStudents")}</p>
          <p className="text-3xl font-bold tracking-tight">{d.totalStudents}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("reportTotalGroups")}</p>
          <p className="text-3xl font-bold tracking-tight">{d.totalGroups}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("reportTotalTeachers")}</p>
          <p className="text-3xl font-bold tracking-tight">{d.totalTeachers}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("reportStudentsOverHalf")}</p>
          <p className="text-3xl font-bold tracking-tight text-accent">{d.studentsAttendedOverHalf}</p>
          <p className="text-xs text-muted">{t("reportOutOf", { total: d.totalStudents })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("attendanceRateYear")}</p>
          <p className="text-3xl font-bold tracking-tight text-accent">{d.overallAttendanceRate}%</p>
          <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${d.overallAttendanceRate}%` }} />
          </div>
          <p className="text-xs text-muted">{d.overallAttPresent} / {d.overallAttTotal}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("examPassRateYear")}</p>
          <p className="text-3xl font-bold tracking-tight text-accent">{d.overallExamPassRate}%</p>
          <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${d.overallExamPassRate}%` }} />
          </div>
          <p className="text-xs text-muted">{d.examPassed} {t("examPassed")} / {d.examPassed + d.examFailed} {t("examTotal")}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted">{t("lessonCompletionYear")}</p>
          <p className="text-3xl font-bold tracking-tight text-accent">{d.overallLessonRate}%</p>
          <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(d.overallLessonRate, 100)}%` }} />
          </div>
        </div>
      </div>

      {d.groups.length > 0 && (
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
                {d.groups.map((g, i) => (
                  <tr key={g.id} className={i === 0 ? "bg-accent-subtle/50" : ""}>
                    <td className="px-4 py-2.5 font-medium">
                      {i === 0 && <span className="text-accent mr-1">★</span>}
                      {g.name}
                    </td>
                    <td className="text-center px-3 py-2.5">{g.studentCount}</td>
                    <td className="text-center px-3 py-2.5">{g.attendanceRate}%</td>
                    <td className="text-center px-3 py-2.5">{g.lessonRate}%</td>
                    <td className="text-center px-3 py-2.5">
                      {g.examPassRate}%
                      <span className="text-xs text-muted ml-1">({g.examPassed}✓ {g.examFailed}✗)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {d.topStudents.length > 0 && (
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
                {d.topStudents.map((s, i) => (
                  <tr key={s.id} className={i < 3 ? "bg-accent-subtle/50" : ""}>
                    <td className="text-center px-3 py-2.5">
                      <span className={`inline-flex items-center justify-center rounded-full text-xs font-bold ${i < 3 ? "bg-accent text-primary-foreground h-6 w-6" : "text-muted"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{s.fullName}</td>
                    <td className="text-center px-3 py-2.5">{s.attendanceRate}%</td>
                    <td className="text-center px-3 py-2.5">{s.lessonCompletionRate}%</td>
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

export function AdminGdpr({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success-subtle text-success-fg";
      case "pending": return "bg-warning-subtle text-warning-fg";
      case "processing": return "bg-info-subtle text-info-fg";
      case "rejected": return "bg-danger-subtle text-danger-fg";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title={t("gdpr")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("gdpr") }]}
      />

      <p className="text-sm text-muted max-w-3xl">{t("gdprAdminDesc")}</p>

      <div className="rounded-xl border border-card-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-card-border">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("gdprWhen")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("gdprType")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("gdprUser")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("gdprStatus")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("gdprReason")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {gdprRequests.map((req) => (
              <tr key={req.id} className="hover:bg-card transition-colors">
                <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">
                  {new Date(req.requestedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${req.type === "deletion" ? "bg-danger-subtle text-danger-fg" : "bg-info-subtle text-info-fg"}`}>
                    {t(`gdprType_${req.type}` as "gdprType_export" | "gdprType_deletion")}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{req.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${statusColor(req.status)}`}>
                    {t(`gdprStatus_${req.status}` as "gdprStatus_pending" | "gdprStatus_completed" | "gdprStatus_rejected" | "gdprStatus_processing")}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted text-xs">{req.reason}</td>
              </tr>
            ))}
            {gdprRequests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                  {t("gdprNone")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSecurity({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");
  const tSec = useTranslations("Security");
  const [tab, setTab] = useState<"logins" | "otps" | "resets">("logins");

  const statusBadge = (status: string) =>
    status === "success"
      ? "bg-success-subtle text-success-fg"
      : status === "failed"
        ? "bg-danger-subtle text-danger-fg"
        : status === "activated"
          ? "bg-success-subtle text-success-fg"
          : status === "expired"
            ? "bg-warning-subtle text-warning-fg"
            : status === "pending"
              ? "bg-info-subtle text-info-fg"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";

  const tabs = [
    { key: "logins" as const, label: tSec("loginLog") },
    { key: "otps" as const, label: tSec("activationCodes") },
    { key: "resets" as const, label: tSec("passwordResets") },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title={tSec("title")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: tSec("title") }]}
      />

      <div className="flex gap-1 rounded-lg border border-card-border bg-surface p-1 w-fit">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === tb.key
                ? "bg-accent text-primary-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "logins" && (
        <div className="space-y-3">
          <p className="text-sm text-muted">{tSec("lastAttempts")}</p>
          <div className="rounded-xl border border-card-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface/50 border-b border-card-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{tSec("colEmail")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{tSec("colStatus")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{tSec("colIp")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{tSec("colDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {loginAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-card transition-colors">
                    <td className="px-4 py-3">{log.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${statusBadge(log.status)}`}>
                        {log.status === "success" ? tSec("success") : tSec("failed")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">{log.ip}</td>
                    <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "otps" && (
        <div className="space-y-3">
          <p className="text-sm text-muted">{tSec("activationCodesDesc")}</p>
          <div className="rounded-xl border border-card-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface/50 border-b border-card-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{tSec("colUser")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{tSec("colStatus")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{tSec("colExpiry")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{tSec("colCreated")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {otpIssues.map((otp) => (
                  <tr key={otp.id} className="hover:bg-card transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{otp.userId}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium capitalize ${statusBadge(otp.status)}`}>
                        {otp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">
                      {new Date(otp.expiry).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">
                      {new Date(otp.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {otpIssues.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">{tSec("noEntries")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "resets" && (
        <div className="space-y-3">
          <p className="text-sm text-muted">{tSec("passwordResetsDesc")}</p>
          <div className="rounded-xl border border-card-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface/50 border-b border-card-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{tSec("colUser")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{tSec("colReason")}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{tSec("colDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {passwordResets.map((reset) => (
                  <tr key={reset.id} className="hover:bg-card transition-colors">
                    <td className="px-4 py-3">{reset.userId}</td>
                    <td className="px-4 py-3 text-muted">{reset.reason}</td>
                    <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">
                      {new Date(reset.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {passwordResets.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-muted">{tSec("noEntries")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminWrittenTests({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const t = useTranslations("Admin");
  const tWt = useTranslations("WrittenTests");

  const questionsByTopic = new Map<string, typeof examQuestions>();
  for (const q of examQuestions) {
    const list = questionsByTopic.get(q.topicId) ?? [];
    list.push(q);
    questionsByTopic.set(q.topicId, list);
  }

  const difficultyBadge = (d: string) => {
    switch (d) {
      case "easy": return "bg-success-subtle text-success-fg";
      case "medium": return "bg-warning-subtle text-warning-fg";
      case "hard": return "bg-danger-subtle text-danger-fg";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const difficultyLabel = (d: string) => {
    switch (d) {
      case "easy": return tWt("easy");
      case "medium": return tWt("medium");
      case "hard": return tWt("hard");
      default: return d;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("writtenTests")}
        breadcrumbs={[{ label: t("overview"), onClick: () => onNavigate({ page: "overview" }) }, { label: t("writtenTests") }]}
      />

      <div className="rounded-xl border border-card-border bg-card p-4 opacity-50 pointer-events-none">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{tWt("newTest")}</h3>
          <button disabled className={cn(buttonVariants({ size: "sm" }), "cursor-not-allowed")}>
            {tWt("generatePdf")}
          </button>
        </div>
        <p className="text-xs text-muted">{tWt("newTestSub")}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{tWt("questionBank")}</h2>
        <p className="text-sm text-muted">{tWt("questionBankSub")}</p>
        {topics.map((tp) => {
          const tpQuestions = questionsByTopic.get(tp.id) ?? [];
          if (tpQuestions.length === 0) return null;
          return (
            <div key={tp.id} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted">{tp.title}</h3>
              <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
                {tpQuestions.map((q) => (
                  <li key={q.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm">{q.text}</p>
                    </div>
                    <span className={`shrink-0 text-xs rounded-full px-2 py-0.5 font-medium ${difficultyBadge(q.difficulty)}`}>
                      {difficultyLabel(q.difficulty)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
