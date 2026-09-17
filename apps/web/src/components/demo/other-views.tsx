"use client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  ChevronRight,
  ChevronLeft,
  CalendarCheck,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Headphones,
  Pause,
  Play,
} from "lucide-react";

import {
  type DemoView,
  demoSurahs,
  demoSurahContent,
  demoSavedAyahs,
  demoReciters,
  demoHifzStudent,
  demoClassHifz,
  students,
  groups,
  lessons,
  topics,
  homeworkAssignments,
  attendanceSessions,
  progressNotes,
  weeklyNotes,
  announcements,
  messageThreads,
  notifications,
  homeworkSubmissions,
  examSessions,
  examRequests,
  examQuestions,
  calendarSchedules,
  platformMosques,
  platformBilling,
  platformGdprLogs,
  getStudentsInGroup,
  getGroupsForTeacher,
  getGroupsForStudent,
  getParentsForStudent,
  getAttendanceForGroup,
  getAttendanceForStudent,
  getHomeworkForGroup,
  getHomeworkForStudent,
  getNotesForStudent,
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
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm text-muted">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {b.onClick ? (
              <button
                onClick={b.onClick}
                className="hover:text-accent transition-colors"
              >
                {b.label}
              </button>
            ) : (
              <span className="font-medium text-foreground">{b.label}</span>
            )}
            {i < breadcrumbs.length - 1 && (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        ))}
      </div>
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  present: "bg-success",
  late: "bg-warning",
  absent: "bg-danger",
  excused: "bg-info",
};

const STATUS_PILL: Record<string, string> = {
  present:
    "bg-success-subtle text-success-fg",
  absent: "bg-danger-subtle text-danger-fg",
  late: "bg-warning-subtle text-warning-fg",
  excused:
    "bg-info-subtle text-info-fg",
};

const STATUS_CLS = (status: string) =>
  status === "present"
    ? "bg-success-subtle text-success-fg"
    : status === "late"
      ? "bg-warning-subtle text-warning-fg"
      : status === "absent"
        ? "bg-danger-subtle text-danger-fg"
        : "bg-info-subtle text-info-fg";

function urgencyBadge(
  dueDate: string | null,
): { label: string; cls: string } | null {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0)
    return {
      label: "overdue",
      cls: "bg-danger-subtle text-danger-fg",
    };
  if (diff < 3 * 24 * 60 * 60 * 1000)
    return {
      label: "soon",
      cls: "bg-warning-subtle text-warning-fg",
    };
  return null;
}

const URGENCY_BADGE: Record<string, string> = {
  overdue:
    "bg-danger-subtle text-danger-fg",
  soon: "bg-warning-subtle text-warning-fg",
  later: "bg-card-border text-muted",
  none: "bg-card-border text-muted",
};

function homeworkUrgency(
  dueDate: string | null,
): "overdue" | "soon" | "later" | "none" {
  if (!dueDate) return "none";
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 3 * 24 * 60 * 60 * 1000) return "soon";
  return "later";
}

export function TeacherOverview({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Teacher");
  const tAdmin = useTranslations("Admin");

  const teacherGroups = getGroupsForTeacher("t1");
  const teacherGroupIds = teacherGroups.map((g) => g.id);

  const recentSessions = attendanceSessions
    .filter((s) => teacherGroupIds.includes(s.groupId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const upcomingHomework = homeworkAssignments
    .filter(
      (h) =>
        teacherGroupIds.includes(h.groupId) &&
        h.dueDate >= new Date().toISOString().slice(0, 10),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("welcome")}</h1>
        <p className="text-sm text-muted">{t("welcomeSub")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("myGroups")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teacherGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => onNavigate({ page: "group-detail", id: g.id })}
              className="text-left rounded-xl border border-card-border bg-card p-5 transition-colors hover:bg-accent-subtle w-full"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{g.name}</div>
                  {g.description ? (
                    <div className="text-sm text-muted mt-0.5 line-clamp-2">
                      {g.description}
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {g.studentIds.length} {t("studentsCount")}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted shrink-0 mt-0.5" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold">{t("recentSessions")}</h2>
          </div>
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
            {recentSessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 p-3.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {new Date(s.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-muted truncate">
                    {s.groupName}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-accent">
                  {tAdmin("attendance")}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold">{t("upcomingHomework")}</h2>
          </div>
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
            {upcomingHomework.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 p-3.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{h.title}</div>
                  <div className="text-xs text-muted">{h.groupName}</div>
                </div>
                <span className="shrink-0 text-xs text-muted whitespace-nowrap">
                  {new Date(h.dueDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function TeacherGroups({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Teacher");
  const teacherGroupList = getGroupsForTeacher("t1");

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("myGroups")}
        breadcrumbs={[
          { label: t("overview"), onClick: () => onNavigate({ page: "overview" }) },
          { label: t("myGroups") },
        ]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {teacherGroupList.map((g) => (
          <li key={g.id}>
            <button
              onClick={() => onNavigate({ page: "group-detail", id: g.id })}
              className="block w-full text-left p-4 transition-colors hover:bg-accent-subtle"
            >
              <div className="font-medium">{g.name}</div>
              {g.description ? (
                <div className="text-sm text-muted">{g.description}</div>
              ) : null}
            </button>
          </li>
        ))}
        {teacherGroupList.length === 0 ? (
          <li className="p-4 text-sm text-muted">{t("noGroupsAssigned")}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function TeacherGroupDetail({
  groupId,
  onNavigate,
}: {
  groupId: string;
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Teacher");
  const tAdmin = useTranslations("Admin");

  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;

  const roster = getStudentsInGroup(groupId);

  const parentMap = new Map<
    string,
    { name: string; childrenInGroup: string[] }
  >();
  roster.forEach((s) => {
    const sParents = getParentsForStudent(s.id);
    sParents.forEach((p) => {
      if (!parentMap.has(p.id)) {
        parentMap.set(p.id, { name: p.fullName, childrenInGroup: [] });
      }
      parentMap.get(p.id)!.childrenInGroup.push(s.fullName);
    });
  });
  const sortedParents = [...parentMap.entries()].sort((a, b) =>
    a[1].name.localeCompare(b[1].name),
  );

  const attendance = getAttendanceForGroup(groupId);
  const homework = getHomeworkForGroup(groupId);
  const notes = progressNotes.filter((n) => n.groupId === groupId);
  const wNotes = weeklyNotes.filter((wn) => wn.groupId === groupId);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={group.name}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          {
            label: t("myGroups"),
            onClick: () => onNavigate({ page: "groups" }),
          },
          { label: group.name },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{tAdmin("roster")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {roster.map((s) => (
            <li key={s.id} className="p-4 font-medium">
              {s.fullName}
            </li>
          ))}
          {roster.length === 0 ? (
            <li className="p-4 text-sm text-muted">
              {tAdmin("noStudentsEnrolled")}
            </li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("parents")}</h2>
        {sortedParents.length > 0 ? (
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
            {sortedParents.map(([, p]) => (
              <li key={p.name} className="p-4">
                <div className="font-medium">{p.name}</div>
                <div className="mt-1 text-sm text-muted">
                  {t("children")}: {p.childrenInGroup.join(", ")}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("noParents")}</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{tAdmin("attendance")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {attendance.map((s) => {
            const presentCount = s.records.filter(
              (r) => r.status === "present" || r.status === "late",
            ).length;
            const absentCount = s.records.filter(
              (r) => r.status === "absent",
            ).length;
            const excusedCount = s.records.filter(
              (r) => r.status === "excused",
            ).length;
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
                          {presentCount} {tAdmin("present")}
                        </span>
                      )}
                      {absentCount > 0 && (
                        <span className="rounded-full bg-danger-subtle text-danger-fg px-2.5 py-0.5 font-semibold">
                          {absentCount} {tAdmin("absent")}
                        </span>
                      )}
                      {excusedCount > 0 && (
                        <span className="rounded-full bg-info-subtle text-info-fg px-2.5 py-0.5 font-semibold">
                          {excusedCount} {tAdmin("excused")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-card-border overflow-hidden divide-y divide-card-border text-sm">
                  {s.records.map((r) => (
                    <div
                      key={r.studentId}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <span className="font-medium">{r.studentName}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_CLS(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
          {attendance.length === 0 ? (
            <li className="p-4 text-sm text-muted">
              {tAdmin("noAttendance")}
            </li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{tAdmin("homework")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {homework.map((h) => (
            <li key={h.id} className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{h.title}</span>
                <span
                  className={`text-xs rounded-full px-2.5 py-0.5 ${
                    h.audience === "group"
                      ? "bg-info-subtle text-info-fg"
                      : "bg-warning-subtle text-warning-fg"
                  }`}
                >
                  {h.audience === "group"
                    ? tAdmin("wholeGroup")
                    : tAdmin("specificStudents")}
                </span>
                {h.dueDate ? (
                  <span className="text-xs text-muted">
                    {tAdmin("due")}{" "}
                    {new Date(h.dueDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                ) : null}
              </div>
              {h.body ? (
                <div className="text-sm text-muted">{h.body}</div>
              ) : null}
            </li>
          ))}
          {homework.length === 0 ? (
            <li className="p-4 text-sm text-muted">{tAdmin("noHomework")}</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("progressNotes")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {notes.map((n) => (
            <li key={n.id} className="p-4 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{n.studentName}</span>
                <span className="text-xs text-muted">
                  {new Date(n.createdAt).toLocaleDateString()}
                  {!n.visibleToParents ? ` · ${t("internalOnly")}` : ""}
                </span>
              </div>
              <div className="text-sm text-muted">{n.body}</div>
            </li>
          ))}
          {notes.length === 0 ? (
            <li className="p-4 text-sm text-muted">{t("noNotes")}</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("weeklyNotes")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {wNotes.map((wn) => (
            <li key={wn.id} className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t("weekOf")} {wn.weekStart}
                </span>
                {wn.isPublished ? (
                  <span className="text-xs rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5 font-semibold">
                    {tAdmin("published")}
                  </span>
                ) : (
                  <span className="text-xs rounded-full bg-muted/20 text-muted px-2 py-0.5">
                    {tAdmin("draft")}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted whitespace-pre-line">
                {wn.body}
              </div>
            </li>
          ))}
          {wNotes.length === 0 ? (
            <li className="p-4 text-sm text-muted">{t("noWeeklyNotes")}</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

export function TeacherNotes({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Teacher");
  const teacherGroupIds = getGroupsForTeacher("t1").map((g) => g.id);
  const allNotes = progressNotes.filter((n) =>
    teacherGroupIds.includes(n.groupId),
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("allNotes")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("allNotes") },
        ]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {allNotes.map((n) => (
          <li key={n.id} className="p-4 space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-sm">{n.studentName}</span>
              <span className="text-xs text-muted whitespace-nowrap">
                {new Date(n.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="text-sm text-muted whitespace-pre-wrap">
              {n.body}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{n.groupName}</span>
              {!n.visibleToParents ? (
                <span className="rounded-full bg-warning-subtle text-warning-fg px-2.5 py-0.5 font-semibold">
                  {t("internalOnly")}
                </span>
              ) : null}
            </div>
          </li>
        ))}
        {allNotes.length === 0 ? (
          <li className="p-4 text-sm text-muted">{t("noNotes")}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function TeacherAnnouncements({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Teacher");
  const teacherGroupList = getGroupsForTeacher("t1");

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("announcements")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("announcements") },
        ]}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-4">
        <input
          disabled
          placeholder={t("announcementTitle")}
          className="rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm opacity-50 cursor-not-allowed"
        />
        <textarea
          disabled
          placeholder={t("announcementBody")}
          rows={3}
          className="rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm opacity-50 cursor-not-allowed resize-none"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <select
            disabled
            className="rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm opacity-50 cursor-not-allowed"
          >
            <option>{t("announcementAudienceMosque")}</option>
            <option>{t("announcementAudienceGroup")}</option>
          </select>
          <select
            disabled
            className="rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm opacity-50 cursor-not-allowed"
          >
            <option>{t("announcementGroup")}</option>
            {teacherGroupList.map((g) => (
              <option key={g.id}>{g.name}</option>
            ))}
          </select>
          <button
            disabled
            className={cn(buttonVariants({ size: "xl" }), "opacity-50 cursor-not-allowed")}
          >
            {t("postAnnouncement")}
          </button>
        </div>
      </div>

      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {announcements.map((a) => (
          <li key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{a.title}</div>
              <span className="shrink-0 text-xs text-muted bg-card-border rounded px-1.5 py-0.5">
                {a.groupName ? a.groupName : t("mosqueWide")}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted whitespace-pre-line">
              {a.body}
            </p>
            {a.publishedAt ? (
              <div className="mt-1 text-xs text-muted">
                {new Date(a.publishedAt).toLocaleDateString()}
              </div>
            ) : null}
          </li>
        ))}
        {announcements.length === 0 ? (
          <li className="p-4 text-sm text-muted">{t("noAnnouncements")}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function TeacherMessages({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Teacher");
  const tMsg = useTranslations("Messaging");

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("messages")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("messages") },
        ]}
      />
      <ul className="divide-y divide-card-border/50 rounded-xl border border-card-border overflow-hidden">
        {messageThreads.map((thread) => {
          const lastMsg = thread.messages[thread.messages.length - 1];
          return (
            <li key={thread.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
                  {lastMsg.authorName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">
                      {thread.subject ?? tMsg("noSubject")}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted tabular-nums">
                      {new Date(thread.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {thread.participants.map((p) => p.name).join(", ")}
                  </div>
                  <div className="text-sm text-muted mt-1 truncate">
                    {lastMsg.authorName}: {lastMsg.body}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        {messageThreads.length === 0 ? (
          <li className="p-4 text-sm text-muted">{tMsg("noMessages")}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function TeacherNotifications({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Teacher");
  const tNotif = useTranslations("Notifications");

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title={t("notifications")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("notifications") },
        ]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {notifications.map((n) => (
          <li key={n.id} className="p-4 space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-sm">{n.subject}</span>
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
        {notifications.length === 0 ? (
          <li className="p-4 text-sm text-muted">
            {tNotif("noNotifications")}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function ParentOverview({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Parent");
  const tAdmin = useTranslations("Admin");

  const parentChildren = students.filter((s) => s.parentIds.includes("p1"));

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("welcome")}</h1>
        <p className="text-sm text-muted">{t("welcomeSub")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("myChildren")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {parentChildren.map((child) => {
            const initials = child.fullName
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            const childAttendance = getAttendanceForStudent(child.id);
            const lastRecord = childAttendance[0]?.records[0];
            const lastStatus = lastRecord?.status ?? "";
            const childGroups = getGroupsForStudent(child.id);
            return (
              <button
                key={child.id}
                onClick={() =>
                  onNavigate({ page: "child-detail", id: child.id })
                }
                className="text-left rounded-xl border border-card-border bg-card p-5 transition-colors hover:bg-accent-subtle w-full"
              >
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
                      {initials}
                    </div>
                    {lastStatus ? (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${STATUS_COLOR[lastStatus] ?? "bg-muted"}`}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{child.fullName}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="flex items-center gap-1 text-sm text-muted">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {childGroups.length} {t("groupsCount")}
                        </span>
                      </div>
                      {lastStatus ? (
                        <span className="text-xs text-muted">
                          {t("lastAttendance")}:{" "}
                          <span
                            className={
                              lastStatus === "present"
                                ? "text-success-fg"
                                : lastStatus === "absent"
                                  ? "text-danger-fg"
                                  : "text-warning-fg"
                            }
                          >
                            {tAdmin(lastStatus)}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function ParentChildren({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Parent");
  const parentStudentList = students.filter((s) => s.parentIds.includes("p1"));

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("myChildren")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("myChildren") },
        ]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {parentStudentList.map((c) => (
          <li key={c.id}>
            <button
              onClick={() =>
                onNavigate({ page: "child-detail", id: c.id })
              }
              className="block w-full text-left p-4 transition-colors hover:bg-accent-subtle"
            >
              <div className="font-medium">{c.fullName}</div>
            </button>
          </li>
        ))}
        {parentStudentList.length === 0 ? (
          <li className="p-4 text-sm text-muted">{t("noChildrenLinked")}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function ParentChildDetail({
  studentId,
  onNavigate,
}: {
  studentId: string;
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Parent");
  const tAdmin = useTranslations("Admin");

  const student = students.find((s) => s.id === studentId);
  if (!student) return null;

  const studentGroups = getGroupsForStudent(studentId);
  const studentAttendance = getAttendanceForStudent(studentId);
  const studentHomework = getHomeworkForStudent(studentId);
  const studentNotes = getNotesForStudent(studentId).filter(
    (n) => n.visibleToParents,
  );
  const submitted = homeworkSubmissions[studentId] ?? [];

  const attendanceDots = studentAttendance.flatMap((s) =>
    s.records.map((r) => ({
      date: s.date,
      status: r.status,
      groupName: s.groupName,
    })),
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={student.fullName}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          {
            label: t("myChildren"),
            onClick: () => onNavigate({ page: "children" }),
          },
          { label: student.fullName },
        ]}
      />

      {studentGroups.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("groups")}</h2>
          <div className="flex flex-wrap gap-2">
            {studentGroups.map((g) => (
              <span
                key={g.id}
                className="rounded-full border border-card-border bg-card px-3 py-1 text-sm"
              >
                {g.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("attendance")}</h2>
        {attendanceDots.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {attendanceDots.map((d, i) => (
                <div
                  key={i}
                  title={`${d.date} — ${d.groupName}: ${d.status}`}
                  className={`h-3 w-3 rounded-full ${STATUS_COLOR[d.status] ?? "bg-muted"}`}
                />
              ))}
            </div>
            <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
              {studentAttendance.slice(0, 20).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-4 p-3.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {new Date(s.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-muted">{s.groupName}</div>
                  </div>
                  {s.records[0] && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[s.records[0].status] ?? ""}`}
                    >
                      {s.records[0].status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">{t("noAttendance")}</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("homework")}</h2>
        {studentHomework.length === 0 ? (
          <p className="text-sm text-muted">{t("noHomework")}</p>
        ) : (
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
            {studentHomework.map((h) => {
              const isAcknowledged = submitted.includes(h.id);
              const urgency = homeworkUrgency(h.dueDate);
              return (
                <li key={h.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-sm leading-snug">
                      {h.title}
                    </div>
                    {h.dueDate ? (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${URGENCY_BADGE[urgency]}`}
                      >
                        {urgency === "overdue"
                          ? tAdmin("overdue")
                          : `${tAdmin("due")} ${new Date(h.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                      </span>
                    ) : null}
                  </div>
                  {h.body ? (
                    <p className="text-sm text-muted whitespace-pre-wrap">
                      {h.body}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-muted">
                      {h.groupName}
                      {h.audience === "individual"
                        ? ` · ${t("individual")}`
                        : ""}
                    </div>
                    {isAcknowledged ? (
                      <span className="text-xs rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5 font-semibold">
                        {t("acknowledged")}
                      </span>
                    ) : (
                      <button
                        disabled
                        className="text-xs rounded-full bg-accent px-2.5 py-0.5 text-primary-foreground opacity-50 cursor-not-allowed"
                      >
                        {t("acknowledge")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {studentNotes.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("progressNotes")}</h2>
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
            {studentNotes.map((n) => (
              <li key={n.id} className="p-4 space-y-1">
                <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                <div className="text-xs text-muted">
                  {new Date(n.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {` · ${n.groupName}`}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function ParentLessons({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Parent");

  const lessonsByTopic = new Map<string | null, typeof lessons>();
  for (const topic of topics) {
    lessonsByTopic.set(topic.id, []);
  }
  for (const lesson of lessons) {
    const key = lesson.topicId ?? null;
    if (!lessonsByTopic.has(key)) lessonsByTopic.set(key, []);
    lessonsByTopic.get(key)!.push(lesson);
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("lessonLibrary")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("lessonLibrary") },
        ]}
      />

      {topics.map((topic) => {
        const topicLessons = lessonsByTopic.get(topic.id) ?? [];
        if (topicLessons.length === 0) return null;
        return (
          <section key={topic.id} className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">{topic.title}</h2>
            <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
              {topicLessons.map((lesson) => (
                <li key={lesson.id} className="p-4">
                  <div className="font-medium">{lesson.title}</div>
                  {lesson.body ? (
                    <div className="text-sm text-muted mt-0.5 line-clamp-2">
                      {lesson.body}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {(() => {
        const uncategorised = lessonsByTopic.get(null) ?? [];
        if (uncategorised.length === 0) return null;
        return (
          <section className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">{t("uncategorised")}</h2>
            <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
              {uncategorised.map((lesson) => (
                <li key={lesson.id} className="p-4">
                  <div className="font-medium">{lesson.title}</div>
                  {lesson.body ? (
                    <div className="text-sm text-muted mt-0.5 line-clamp-2">
                      {lesson.body}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {lessons.length === 0 ? (
        <p className="text-sm text-muted">{t("noLessons")}</p>
      ) : null}
    </div>
  );
}

export function ParentAnnouncements({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Parent");

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("announcements")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("announcements") },
        ]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {announcements.map((a) => (
          <li key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{a.title}</div>
              {a.groupName ? (
                <span className="shrink-0 text-xs text-muted bg-card-border rounded px-1.5 py-0.5">
                  {a.groupName}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted whitespace-pre-line">
              {a.body}
            </p>
            {a.publishedAt ? (
              <div className="mt-1 text-xs text-muted">
                {new Date(a.publishedAt).toLocaleDateString()}
              </div>
            ) : null}
          </li>
        ))}
        {announcements.length === 0 ? (
          <li className="p-4 text-sm text-muted">{t("noAnnouncements")}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function ParentMessages({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Parent");
  const tMsg = useTranslations("Messaging");

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("messages")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("messages") },
        ]}
      />
      <ul className="divide-y divide-card-border/50 rounded-xl border border-card-border overflow-hidden">
        {messageThreads.map((thread) => {
          const lastMsg = thread.messages[thread.messages.length - 1];
          return (
            <li key={thread.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
                  {lastMsg.authorName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">
                      {thread.subject ?? tMsg("noSubject")}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted tabular-nums">
                      {new Date(thread.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {thread.participants.map((p) => p.name).join(", ")}
                  </div>
                  <div className="text-sm text-muted mt-1 truncate">
                    {lastMsg.authorName}: {lastMsg.body}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        {messageThreads.length === 0 ? (
          <li className="p-4 text-sm text-muted">{tMsg("noMessages")}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function ParentNotifications({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Parent");
  const tNotif = useTranslations("Notifications");

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title={t("notifications")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("notifications") },
        ]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {notifications.map((n) => (
          <li key={n.id} className="p-4 space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-sm">{n.subject}</span>
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
        {notifications.length === 0 ? (
          <li className="p-4 text-sm text-muted">
            {tNotif("noNotifications")}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function StudentOverview({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Student");
  const tDemo = useTranslations("Demo");

  const student = students.find((s) => s.id === "s1")!;
  const studentGroups = getGroupsForStudent("s1");
  const studentHomeworkList = getHomeworkForStudent("s1");

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="rounded-xl border border-card-border bg-card p-6">
        <p className="text-sm text-muted">{t("welcomeSub")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {t("welcome")},{" "}
          <span className="text-accent">{student.fullName}</span>
        </h1>
        <p className="mt-1 text-sm text-muted">{tDemo("demoMosque")}</p>
        <div className="mt-4 flex items-center gap-2 w-fit rounded-full border border-card-border bg-background px-3 py-1.5">
          <CalendarCheck className="h-3.5 w-3.5 text-accent shrink-0" />
          <span className="text-xs font-medium">
            {t("attendanceRate")}: <span className="text-accent">92%</span>
          </span>
          <span className="text-xs text-muted">
            (28 {t("sessions")})
          </span>
        </div>
      </div>

      {studentGroups.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("myGroups")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {studentGroups.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-card-border bg-card p-4"
              >
                <div className="font-medium text-sm">{g.name}</div>
                {g.description ? (
                  <p className="mt-0.5 text-xs text-muted line-clamp-2">
                    {g.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("upcomingHomework")}</h2>
          <button
            onClick={() => onNavigate({ page: "homework" })}
            className="flex items-center gap-0.5 text-sm text-accent hover:underline"
          >
            {t("viewAll")}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {studentHomeworkList.length > 0 ? (
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
            {studentHomeworkList.slice(0, 5).map((h) => {
              const badge = urgencyBadge(h.dueDate);
              return (
                <li
                  key={h.id}
                  className="p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-medium text-sm truncate">
                      {h.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <BookOpen className="h-3 w-3 shrink-0" />
                      <span>{h.groupName}</span>
                      {h.dueDate ? (
                        <span>
                          {t("dueDate")}:{" "}
                          {new Date(h.dueDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {badge ? (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
                    >
                      {badge.label === "overdue"
                        ? t("overdue")
                        : t("dueSoon")}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("noHomework")}</p>
        )}
      </section>
    </div>
  );
}

export function StudentHomework({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Student");

  const allHomework = getHomeworkForStudent("s1");
  const now = new Date();
  const upcoming = allHomework.filter(
    (h) => !h.dueDate || new Date(h.dueDate) >= now,
  );
  const past = allHomework.filter(
    (h) => h.dueDate && new Date(h.dueDate) < now,
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("homework")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("homework") },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("upcoming")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {upcoming.length > 0 ? (
            upcoming.map((h) => {
              const badge = urgencyBadge(h.dueDate);
              return (
                <li key={h.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-sm leading-snug">
                      {h.title}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {badge ? (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
                        >
                          {badge.label === "overdue"
                            ? t("overdue")
                            : t("dueSoon")}
                        </span>
                      ) : null}
                      {h.dueDate ? (
                        <span className="text-xs text-muted whitespace-nowrap">
                          {t("dueDate")}:{" "}
                          {new Date(h.dueDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {h.body ? (
                    <p className="text-sm text-muted whitespace-pre-wrap">
                      {h.body}
                    </p>
                  ) : null}
                  <div className="text-xs text-muted">
                    {h.groupName}
                    {h.audience === "individual"
                      ? ` · ${t("individual")}`
                      : ""}
                  </div>
                </li>
              );
            })
          ) : (
            <li className="p-4 text-sm text-muted">{t("noHomework")}</li>
          )}
        </ul>
      </section>

      {past.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-muted">{t("past")}</h2>
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden opacity-70">
            {past.map((h) => {
              const badge = urgencyBadge(h.dueDate);
              return (
                <li key={h.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-sm leading-snug">
                      {h.title}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {badge ? (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
                        >
                          {badge.label === "overdue"
                            ? t("overdue")
                            : t("dueSoon")}
                        </span>
                      ) : null}
                      {h.dueDate ? (
                        <span className="text-xs text-muted whitespace-nowrap">
                          {t("dueDate")}:{" "}
                          {new Date(h.dueDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {h.body ? (
                    <p className="text-sm text-muted whitespace-pre-wrap">
                      {h.body}
                    </p>
                  ) : null}
                  <div className="text-xs text-muted">
                    {h.groupName}
                    {h.audience === "individual"
                      ? ` · ${t("individual")}`
                      : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function StudentAttendance({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Student");

  const studentAttendance = getAttendanceForStudent("s1");
  const allRecords = studentAttendance.flatMap((s) => s.records);
  const presentCount = allRecords.filter(
    (r) => r.status === "present" || r.status === "late",
  ).length;
  const attendanceRate =
    allRecords.length > 0
      ? Math.round((presentCount / allRecords.length) * 100)
      : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={t("attendance")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("attendance") },
        ]}
      />

      {allRecords.length > 0 ? (
        <div className="rounded-xl border border-card-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">
              {t("attendanceRate")}:{" "}
              <span className="text-accent">{attendanceRate}%</span>
            </span>
            <span className="text-sm text-muted">
              ({allRecords.length} {t("sessions")})
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>
      ) : null}

      {allRecords.length === 0 ? (
        <p className="text-sm text-muted">{t("noAttendance")}</p>
      ) : (
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {studentAttendance.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 p-3.5"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {new Date(s.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="text-xs text-muted">{s.groupName}</div>
              </div>
              {s.records[0] && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[s.records[0].status] ?? ""}`}
                >
                  {t(
                    `status_${s.records[0].status}` as
                      | "status_present"
                      | "status_absent"
                      | "status_late"
                      | "status_excused",
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StudentAnnouncements({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Student");
  const tAdmin = useTranslations("Admin");

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={t("announcements")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("announcements") },
        ]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {announcements.map((a) => (
          <li key={a.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-sm">{a.title}</h3>
              <span className="shrink-0 text-xs text-muted">
                {new Date(a.publishedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-muted whitespace-pre-wrap">{a.body}</p>
          </li>
        ))}
        {announcements.length === 0 ? (
          <li className="p-4 text-sm text-muted">
            {tAdmin("noAnnouncements")}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function StudentExams({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Student");

  const studentExamSessions = examSessions.filter(
    (e) => e.studentName === "Amina Demirovic" || e.studentName === "Layla Begic",
  );
  const upcoming = studentExamSessions.filter(
    (e) => !["passed", "failed", "cancelled"].includes(e.status),
  );
  const past = studentExamSessions.filter((e) =>
    ["passed", "failed"].includes(e.status),
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "passed": return "bg-success-subtle text-success-fg";
      case "failed": return "bg-danger-subtle text-danger-fg";
      case "in_progress": return "bg-warning-subtle text-warning-fg";
      case "scheduled": return "bg-accent-subtle text-accent";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={t("upcomingExams")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("upcomingExams") },
        ]}
      />

      {upcoming.length === 0 ? (
        <p className="text-sm text-muted">—</p>
      ) : (
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {upcoming.map((es) => (
            <li key={es.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{es.groupName}</span>
                <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${statusColor(es.status)}`}>
                  {es.status === "scheduled" ? t("examConfirmed" as never) : es.status === "in_progress" ? "In progress" : es.status}
                </span>
              </div>
              <div className="text-xs text-muted">{t("examOn" as never)}: {es.examDate}</div>
              {es.summary ? (
                <p className="text-xs text-muted whitespace-pre-wrap">{es.summary}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{t("pastExams" as never)}</h2>
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
            {past.map((es) => (
              <li key={es.id} className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{es.examDate}</span>
                  <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${statusColor(es.status)}`}>
                    {es.status === "passed" ? "✔" : "✗"}
                  </span>
                </div>
                <div className="text-xs text-muted mt-1">{es.groupName}</div>
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

export function ExaminerOverview({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  void onNavigate;
  const t = useTranslations("Examiner");

  const statusColor = (status: string) => {
    switch (status) {
      case "passed": return "bg-success-subtle text-success-fg";
      case "failed": return "bg-danger-subtle text-danger-fg";
      case "in_progress": return "bg-warning-subtle text-warning-fg";
      default: return "bg-info-subtle text-info-fg";
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("welcome")}</h1>
        <p className="text-sm text-muted">{t("welcomeSub")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("pendingRequests")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {examRequests.map((req) => (
            <li key={req.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{req.studentName}</span>
                  <span className="text-sm text-muted ml-2">({req.groupName})</span>
                </div>
                <button
                  disabled
                  className={cn(buttonVariants({ size: "sm" }), "opacity-50 cursor-not-allowed")}
                >
                  {t("acceptAndStart")}
                </button>
              </div>
              <div className="text-xs text-muted">
                {t("requestedBy")}: {req.teacherName}
                {req.notes ? <> · {req.notes}</> : null}
              </div>
            </li>
          ))}
          {examRequests.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noPendingRequests")}</li>
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("recentExams")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {examSessions.map((session) => (
            <li key={session.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{session.studentName}</span>
                  <span className="text-sm text-muted">({session.groupName})</span>
                </div>
                <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${statusColor(session.status)}`}>
                  {t(`examStatus_${session.status}` as "examStatus_scheduled" | "examStatus_in_progress" | "examStatus_passed" | "examStatus_failed")}
                </span>
              </div>
              {session.summary ? (
                <div className="mt-1 text-sm text-muted">{session.summary}</div>
              ) : null}
              <div className="mt-1 text-xs text-muted">{t("date")}: {session.examDate}</div>
            </li>
          ))}
          {examSessions.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noRecentExams")}</li>
          )}
        </ul>
      </section>
    </div>
  );
}

export function ExaminerExams({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Examiner");

  const statusColor = (status: string) => {
    switch (status) {
      case "passed": return "bg-success-subtle text-success-fg";
      case "failed": return "bg-danger-subtle text-danger-fg";
      case "in_progress": return "bg-warning-subtle text-warning-fg";
      default: return "bg-info-subtle text-info-fg";
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
        title={t("recentExams")}
        breadcrumbs={[
          { label: t("overview"), onClick: () => onNavigate({ page: "overview" }) },
          { label: t("recentExams") },
        ]}
      />

      {examRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{t("pendingRequests")}</h2>
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
            {examRequests.map((req) => (
              <li key={req.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{req.studentName}</span>
                    <span className="text-sm text-muted ml-2">({req.groupName})</span>
                  </div>
                  <button
                    disabled
                    className={cn(buttonVariants({ size: "sm" }), "opacity-50 cursor-not-allowed")}
                  >
                    {t("acceptAndStart")}
                  </button>
                </div>
                <div className="text-xs text-muted mt-1">
                  {t("requestedBy")}: {req.teacherName}
                  {req.notes ? <> · {req.notes}</> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{examRequests.length === 0 ? t("pendingRequests") : t("recentExams")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {examSessions.map((session) => (
            <li key={session.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{session.studentName}</span>
                  <span className="text-sm text-muted">({session.groupName})</span>
                </div>
                <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${statusColor(session.status)}`}>
                  {statusLabel(session.status)}
                </span>
              </div>
              {session.summary ? (
                <div className="mt-1 text-sm text-muted truncate">{session.summary}</div>
              ) : null}
              <div className="mt-1 text-xs text-muted">{t("date")}: {session.examDate}</div>
            </li>
          ))}
          {examSessions.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("noRecentExams")}</li>
          )}
        </ul>
      </section>
    </div>
  );
}

export function ExaminerMessages({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Examiner");
  const tMsg = useTranslations("Messaging");

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("messages")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("messages") },
        ]}
      />
      <ul className="divide-y divide-card-border/50 rounded-xl border border-card-border overflow-hidden">
        {messageThreads.map((thread) => {
          const lastMsg = thread.messages[thread.messages.length - 1];
          return (
            <li key={thread.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
                  {lastMsg.authorName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">
                      {thread.subject ?? tMsg("noSubject")}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted tabular-nums">
                      {new Date(thread.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {thread.participants.map((p) => p.name).join(", ")}
                  </div>
                  <div className="text-sm text-muted mt-1 truncate">
                    {lastMsg.authorName}: {lastMsg.body}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        {messageThreads.length === 0 ? (
          <li className="p-4 text-sm text-muted">{tMsg("noMessages")}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function ExaminerNotifications({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Examiner");
  const tNotif = useTranslations("Notifications");

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title={t("notifications")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("notifications") },
        ]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {notifications.map((n) => (
          <li key={n.id} className="p-4 space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-sm">{n.subject}</span>
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
        {notifications.length === 0 ? (
          <li className="p-4 text-sm text-muted">
            {tNotif("noNotifications")}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function TeacherLessons({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Teacher");

  const lessonsByTopic = new Map<string, typeof lessons>();
  for (const topic of topics) {
    lessonsByTopic.set(topic.id, []);
  }
  for (const lesson of lessons) {
    const key = lesson.topicId ?? "";
    if (!lessonsByTopic.has(key)) lessonsByTopic.set(key, []);
    lessonsByTopic.get(key)!.push(lesson);
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("lessonLibrary")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("lessonLibrary") },
        ]}
      />
      {topics.map((topic) => {
        const topicLessons = lessonsByTopic.get(topic.id) ?? [];
        if (topicLessons.length === 0) return null;
        return (
          <section key={topic.id} className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">{topic.title}</h2>
            <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
              {topicLessons.map((lesson) => (
                <li key={lesson.id} className="p-4">
                  <div className="font-medium">{lesson.title}</div>
                  {lesson.body ? (
                    <div className="text-sm text-muted mt-0.5 line-clamp-2">
                      {lesson.body}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {lessons.length === 0 ? (
        <p className="text-sm text-muted">{t("noNotes")}</p>
      ) : null}
    </div>
  );
}

export function TeacherExams({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Teacher");
  const tEx = useTranslations("Examiner");

  const teacherGroupIds = getGroupsForTeacher("t1").map((g) => g.id);
  const teacherExams = examSessions.filter((e) =>
    groups.find((g) => g.name === e.groupName && teacherGroupIds.includes(g.id)),
  );
  const teacherRequests = examRequests.filter((r) =>
    groups.find((g) => g.name === r.groupName && teacherGroupIds.includes(g.id)),
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "passed": return "bg-success-subtle text-success-fg";
      case "failed": return "bg-danger-subtle text-danger-fg";
      case "in_progress": return "bg-warning-subtle text-warning-fg";
      case "scheduled": return "bg-accent-subtle text-accent";
      default: return "bg-info-subtle text-info-fg";
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("recentExamResults")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("recentExamResults") },
        ]}
      />

      {teacherRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{tEx("pendingRequests")}</h2>
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
            {teacherRequests.map((req) => (
              <li key={req.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{req.studentName}</span>
                  <span className="text-sm text-muted">({req.groupName})</span>
                </div>
                {req.notes ? (
                  <div className="text-sm text-muted">{req.notes}</div>
                ) : null}
                <div className="text-xs text-muted">
                  {tEx("requestedBy")}: {req.teacherName}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{tEx("recentExams")}</h2>
        {teacherExams.length > 0 ? (
          <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
            {teacherExams.map((es) => (
              <li key={es.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{es.studentName}</span>
                    <span className="text-sm text-muted shrink-0">({es.groupName})</span>
                  </div>
                  <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium shrink-0 ${statusColor(es.status)}`}>
                    {tEx(`examStatus_${es.status}` as never)}
                  </span>
                </div>
                {es.summary ? (
                  <div className="mt-1 text-sm text-muted truncate">{es.summary}</div>
                ) : null}
                <div className="mt-1 text-xs text-muted">{tEx("date")}: {es.examDate}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{tEx("noRecentExams")}</p>
        )}
      </section>
    </div>
  );
}

export function ParentCalendar({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Parent");

  // Parent p1's children are enrolled in g1 (Koran Anfänger) and g2
  // (Arabische Buchstaben). "My lessons" shows only those groups; "whole
  // mosque" shows everything, like the real parent calendar.
  const parentStudentIds = students
    .filter((s) => s.parentIds.includes("p1"))
    .map((s) => s.id);
  const parentGroupIds = groups
    .filter((g) => g.studentIds.some((sid) => parentStudentIds.includes(sid)))
    .map((g) => g.id);
  const parentSchedules = calendarSchedules.filter((s) =>
    parentGroupIds.some((gid) => groups.find((g) => g.id === gid)?.name === s.groupName),
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("calendar")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("calendar") },
        ]}
      />

      {/* The real week calendar, with demo data — same component as the app. */}
      <DemoWeekCalendar mine={parentSchedules} />
    </div>
  );
}

export function StudentLessons({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Student");

  const lessonsByTopic = new Map<string, typeof lessons>();
  for (const topic of topics) {
    lessonsByTopic.set(topic.id, []);
  }
  for (const lesson of lessons) {
    const key = lesson.topicId ?? "";
    if (!lessonsByTopic.has(key)) lessonsByTopic.set(key, []);
    lessonsByTopic.get(key)!.push(lesson);
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={t("lessonLibrary")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("lessonLibrary") },
        ]}
      />
      {topics.map((topic) => {
        const topicLessons = lessonsByTopic.get(topic.id) ?? [];
        if (topicLessons.length === 0) return null;
        return (
          <section key={topic.id} className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">{topic.title}</h2>
            <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
              {topicLessons.map((lesson) => (
                <li key={lesson.id} className="p-4">
                  <div className="font-medium">{lesson.title}</div>
                  {lesson.body ? (
                    <div className="text-sm text-muted mt-0.5 line-clamp-2">
                      {lesson.body}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {lessons.length === 0 ? (
        <p className="text-sm text-muted">{t("noLessons")}</p>
      ) : null}
    </div>
  );
}

export function StudentNotifications({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Student");
  const tNotif = useTranslations("Notifications");

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title={t("notifications")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("notifications") },
        ]}
      />
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {notifications.map((n) => (
          <li key={n.id} className="p-4 space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-sm">{n.subject ?? tNotif("noSubject")}</span>
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
        {notifications.length === 0 ? (
          <li className="p-4 text-sm text-muted">
            {tNotif("noNotifications")}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function ExaminerWrittenTests({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Examiner");
  const tWt = useTranslations("WrittenTests");

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

  const questionsByTopic = new Map<string, typeof examQuestions>();
  for (const q of examQuestions) {
    const list = questionsByTopic.get(q.topicId) ?? [];
    list.push(q);
    questionsByTopic.set(q.topicId, list);
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={tWt("newTest")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("writtenTests") },
        ]}
      />

      <div className="rounded-xl border border-card-border bg-card p-5 space-y-4 opacity-50 pointer-events-none">
        <div className="flex flex-wrap gap-3">
          <button disabled className="rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium bg-accent text-primary-foreground cursor-not-allowed">
            {tWt("randomMode")}
          </button>
          <button disabled className="rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium cursor-not-allowed">
            {tWt("manualMode")}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input
            disabled
            type="number"
            defaultValue={5}
            className="w-20 rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm cursor-not-allowed"
          />
          <button disabled className={cn(buttonVariants({ size: "sm" }), "cursor-not-allowed")}>
            {tWt("pickRandom")}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input
            disabled
            placeholder={tWt("testTitlePlaceholder")}
            className="flex-1 rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm cursor-not-allowed"
          />
          <button disabled className={cn(buttonVariants({ size: "xl" }), "cursor-not-allowed")}>
            {tWt("generatePdf")}
          </button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{tWt("questionBank")}</h2>
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

export function PlatformAdminOverview({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("PlatformAdmin");

  const activeTrials = platformMosques.filter((m) => m.status === "trialing").length;
  const paying = platformMosques.filter((m) => m.status === "active" && m.plan !== "starter").length;
  const totalStudents = platformMosques.reduce((sum, m) => sum + m.totalStudents, 0);

  const stats = [
    { label: t("totalMosques"), value: platformMosques.length },
    { label: t("activeTrials"), value: activeTrials },
    { label: t("paying"), value: paying },
    { label: t("totalStudents"), value: totalStudents },
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success-subtle text-success-fg";
      case "trialing": return "bg-info-subtle text-info-fg";
      case "canceled": return "bg-danger-subtle text-danger-fg";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">{t("overview")}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-card-border bg-card p-5 space-y-2">
            <p className="text-xs font-medium text-muted">{s.label}</p>
            <p className="text-3xl font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("allMosques")}</h2>
        <div className="rounded-xl border border-card-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface/50 border-b border-card-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("name")}</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("slug")}</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("plan")}</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("status")}</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("created")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {platformMosques.map((m) => (
                <tr key={m.id} className="hover:bg-card transition-colors">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{m.slug}</td>
                  <td className="px-4 py-3">{m.plan}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium capitalize ${statusColor(m.status)}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function PlatformAdminMosques({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("PlatformAdmin");

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success-subtle text-success-fg";
      case "trialing": return "bg-info-subtle text-info-fg";
      case "past_due": return "bg-warning-subtle text-warning-fg";
      case "canceled": return "bg-danger-subtle text-danger-fg";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title={t("mosques")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("mosques") },
        ]}
      />
      <div className="rounded-xl border border-card-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-card-border">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("name")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("slug")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("plan")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("status")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("totalStudents")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("trialEnds")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("created")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {platformMosques.map((m) => (
              <tr key={m.id} className="hover:bg-card transition-colors">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-muted font-mono text-xs">{m.slug}</td>
                <td className="px-4 py-3">{m.plan}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium capitalize ${statusColor(m.status)}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3">{m.totalStudents}</td>
                <td className="px-4 py-3 text-muted text-xs tabular-nums whitespace-nowrap">
                  {m.trialEnd ? new Date(m.trialEnd).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {platformMosques.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                  {t("noMosques")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlatformAdminBilling({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("PlatformAdmin");

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success-subtle text-success-fg";
      case "trialing": return "bg-info-subtle text-info-fg";
      case "past_due": return "bg-warning-subtle text-warning-fg";
      case "canceled": return "bg-danger-subtle text-danger-fg";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title={t("billing")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("billing") },
        ]}
      />
      <div className="rounded-xl border border-card-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-card-border">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("name")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("plan")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("status")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("trialEnds")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("stripeCustomer")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {platformBilling.map((b) => (
              <tr key={b.id} className="hover:bg-card transition-colors">
                <td className="px-4 py-3 font-medium">{b.mosqueName}</td>
                <td className="px-4 py-3">{b.planId}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium capitalize ${statusColor(b.status)}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted text-xs tabular-nums whitespace-nowrap">
                  {b.trialEnd ? new Date(b.trialEnd!).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-muted font-mono text-xs">{b.stripeCustomer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlatformAdminGdpr({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("PlatformAdmin");

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        title={t("gdprLog")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("gdprLog") },
        ]}
      />

      <p className="text-sm text-muted max-w-3xl">{t("gdprLogDesc")}</p>

      <div className="rounded-xl border border-card-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-card-border">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("name")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("slug")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("requestedBy")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("deletionStarted")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("deletionCompleted")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("stripeDeleted")}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">{t("storageFiles")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {platformGdprLogs.map((log) => (
              <tr key={log.id} className="hover:bg-card transition-colors">
                <td className="px-4 py-3 font-medium">{log.mosqueName}</td>
                <td className="px-4 py-3 text-muted font-mono text-xs">{log.mosqueSlug}</td>
                <td className="px-4 py-3 text-sm">{log.requestedBy}</td>
                <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap text-xs">
                  {new Date(log.deletionStarted).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {log.deletionCompleted ? (
                    <span className="text-xs text-success-fg">
                      {new Date(log.deletionCompleted).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-xs rounded-full bg-warning-subtle text-warning-fg px-2.5 py-0.5 font-semibold">
                      {t("pending")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {log.stripeDeleted ? "✓" : "—"}
                </td>
                <td className="px-4 py-3 text-muted text-xs">{log.storageFiles}</td>
              </tr>
            ))}
            {platformGdprLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                  {t("noGdprLogs")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quran & Hifz (shared building blocks)                              */
/* ------------------------------------------------------------------ */

const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302,
  322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

/** Mirrors `HifzProgressMini` from the real student portal. */
function HifzProgressCard({
  pagesMemorized,
  totalPages,
  t,
}: {
  pagesMemorized: number;
  totalPages: number;
  t: (key: string) => string;
}) {
  const pct = Math.round((pagesMemorized / totalPages) * 100);
  const fullJuz = JUZ_START_PAGES.filter((start) => pagesMemorized >= start).length;
  const isComplete = pagesMemorized >= totalPages;

  return (
    <div className="rounded-xl border border-card-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("hifzProgress")}</h3>
        <span className="shrink-0 rounded-full bg-success-subtle text-success-fg px-2.5 py-0.5 font-semibold text-xs font-semibold">
          {isComplete ? t("hifzComplete") : `${fullJuz} ${t("hifzJuz")}`}
        </span>
      </div>
      <div className="flex items-baseline justify-between text-xs text-muted">
        <span className="tabular-nums">
          {pagesMemorized} / {totalPages} {t("hifzPages")} {t("hifzMemorized")}
        </span>
        <span className="tabular-nums font-medium text-foreground">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-success transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid grid-cols-10 gap-1">
        {JUZ_START_PAGES.map((start, i) => {
          const end = i < 29 ? JUZ_START_PAGES[i + 1] - 1 : totalPages;
          const span = end - start + 1;
          const done = Math.min(span, Math.max(0, pagesMemorized - (start - 1)));
          const isFull = done >= span;
          const isPartial = done > 0 && !isFull;
          return (
            <div
              key={i}
              title={`${t("hifzJuz")} ${i + 1}`}
              className={`relative h-5 rounded-md flex items-center justify-center text-[10px] font-medium ${
                isFull
                  ? "bg-success text-white"
                  : isPartial
                    ? "bg-success-subtle text-success-fg"
                    : "bg-muted/20 text-muted"
              }`}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Surah list grid — mirrors the real `SurahList` component. */
function SurahGrid({
  t,
  onSelect,
}: {
  t: (key: string) => string;
  onSelect?: (surah: (typeof demoSurahs)[number]) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {demoSurahs.map((s) => (
        <button
          key={s.number}
          onClick={onSelect ? () => onSelect(s) : undefined}
          className={`flex items-center gap-3 rounded-xl border border-card-border bg-card px-4 py-3 text-left transition-colors ${
            onSelect
              ? "hover:border-accent/50 hover:bg-accent-subtle cursor-pointer"
              : "cursor-default"
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-subtle text-success-fg text-xs font-bold">
            {s.number}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{s.englishName}</span>
              <span className="font-arabic text-sm text-muted truncate" lang="ar" dir="rtl">
                {s.arabicName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>
                {s.numberOfAyahs} {t("quranVerses")}
              </span>
              <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px]">
                {s.revelationType === "Meccan" ? t("quranMeccan") : t("quranMedinan")}
              </span>
            </div>
          </div>
          {onSelect ? <ChevronRight className="h-4 w-4 shrink-0 text-muted" /> : null}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Student — Quran & Hifz                                              */
/* ------------------------------------------------------------------ */

export function StudentQuran({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Student");

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("quranTitle")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("quranTitle") },
        ]}
      />

      <HifzProgressCard
        pagesMemorized={demoHifzStudent.pagesMemorized}
        totalPages={demoHifzStudent.totalPages}
        t={t}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("quranTitle")}</h2>
        <SurahGrid
          t={t}
          onSelect={(s) => onNavigate({ page: "student-quran-surah", id: String(s.number) })}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("quranSavedAyahs")}</h2>
        <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
          {demoSavedAyahs.map((a) => (
            <li key={a.id} className="p-4 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {a.surahName} · {t("quranAyah")} {a.ayahNumber}
                </span>
                <span className="text-xs text-muted">
                  {new Date(a.savedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-right text-lg leading-relaxed font-arabic" dir="rtl" lang="ar">
                {a.arabic}
              </p>
              <p className="text-sm text-muted">{a.translation}</p>
            </li>
          ))}
          {demoSavedAyahs.length === 0 && (
            <li className="p-4 text-sm text-muted">{t("quranNoSavedAyahs")}</li>
          )}
        </ul>
      </section>
    </div>
  );
}

export function StudentQuranSurah({
  surahId,
  onNavigate,
}: {
  surahId: string;
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Student");
  const number = parseInt(surahId, 10);
  const surah = demoSurahs.find((s) => s.number === number) ?? demoSurahs[0];
  const content = demoSurahContent[surah.number] ?? demoSurahContent[1];
  const idx = demoSurahs.findIndex((s) => s.number === surah.number);
  const prev = idx > 0 ? demoSurahs[idx - 1] : null;
  const next = idx < demoSurahs.length - 1 ? demoSurahs[idx + 1] : null;

  const [playing, setPlaying] = useState(false);
  const [reciter, setReciter] = useState(demoReciters[0].id);
  const [savedAyahs, setSavedAyahs] = useState<Set<number>>(
    () => new Set([1, 7]),
  );

  const toggleSaved = (ayahNumber: number) => {
    setSavedAyahs((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(ayahNumber)) nextSet.delete(ayahNumber);
      else nextSet.add(ayahNumber);
      return nextSet;
    });
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title={`${surah.number}. ${surah.englishName}`}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          {
            label: t("quranTitle"),
            onClick: () => onNavigate({ page: "student-quran" }),
          },
          { label: surah.englishName },
        ]}
      />

      <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-success-subtle text-success-fg font-arabic text-lg">
          {surah.arabicName}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {surah.englishName}
          </div>
          <div className="text-xs text-muted">
            {surah.numberOfAyahs} {t("quranVerses")} ·{" "}
            {surah.revelationType === "Meccan" ? t("quranMeccan") : t("quranMedinan")}
          </div>
        </div>
      </div>

      {/* Audio player */}
      <div className="rounded-xl border border-card-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? t("quranPauseAudio") : t("quranPlayAudio")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-white hover:bg-success/90 transition-colors"
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 translate-x-px" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Headphones className="h-4 w-4 text-muted shrink-0" />
              <span className="truncate">{t("quranTitle")} — {surah.englishName}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted/20 overflow-hidden">
              <div
                className={`h-full rounded-full bg-success ${playing ? "" : "opacity-40"}`}
                style={{ width: playing ? "38%" : "12%" }}
              />
            </div>
          </div>
          <select
            value={reciter}
            onChange={(e) => setReciter(e.target.value)}
            className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-xs"
          >
            {demoReciters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="tabular-nums">{playing ? "0:42" : "0:00"}</span>
          <span className="tabular-nums">1:52</span>
        </div>
      </div>

      {/* Ayahs */}
      <ul className="divide-y divide-card-border rounded-xl border border-card-border overflow-hidden">
        {content.ayahs.map((ayah) => {
          const isSaved = savedAyahs.has(ayah.number);
          return (
            <li key={ayah.number} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-subtle text-success-fg text-xs font-semibold">
                  {ayah.number}
                </span>
                <button
                  onClick={() => toggleSaved(ayah.number)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    isSaved
                      ? "bg-success-subtle text-success-fg"
                      : "text-muted hover:bg-muted/20"
                  }`}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="h-3.5 w-3.5" />
                      {t("quranSavedAyah")}
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5" />
                      {t("quranSaveAyah")}
                    </>
                  )}
                </button>
              </div>
              <p className="text-right text-2xl leading-loose font-arabic" dir="rtl" lang="ar">
                {ayah.arabic}
              </p>
              <p className="text-sm text-muted">{ayah.translation}</p>
            </li>
          );
        })}
      </ul>

      {/* Prev / next */}
      <div className="flex items-center justify-between gap-3">
        {prev ? (
          <button
            onClick={() => onNavigate({ page: "student-quran-surah", id: String(prev.number) })}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {prev.englishName}
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button
            onClick={() => onNavigate({ page: "student-quran-surah", id: String(next.number) })}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors"
          >
            {next.englishName}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Student — Calendar                                                  */
/* ------------------------------------------------------------------ */

export function StudentCalendar({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Student");

  // Demo student s1 is enrolled in g1 (Koran Anfänger) and g2 (Arabische
  // Buchstaben). "My lessons" shows only those groups; "whole mosque" shows
  // everything, like the real student calendar.
  const studentGroupNames = groups
    .filter((g) => students.find((s) => s.id === "s1")?.groups.includes(g.id))
    .map((g) => g.name);
  const studentSchedules = calendarSchedules.filter((s) =>
    studentGroupNames.includes(s.groupName),
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("calendar")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("calendar") },
        ]}
      />

      {/* The real week calendar, with demo data — same component as the app. */}
      <DemoWeekCalendar mine={studentSchedules} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Parent — Quran & Hifz                                               */
/* ------------------------------------------------------------------ */

export function ParentQuran({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Parent");
  const child = students.find((s) => s.parentIds.includes("p1"))!;

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("quranTitle")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("quranTitle") },
        ]}
      />

      <div className="rounded-xl border border-card-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{child.fullName}</span>
          <span className="text-xs text-muted">{t("overview")}</span>
        </div>
        <HifzProgressCard
          pagesMemorized={demoHifzStudent.pagesMemorized}
          totalPages={demoHifzStudent.totalPages}
          t={t}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("quranTitle")}</h2>
        <p className="text-sm text-muted">
          {t("welcome")} — {t("quranTitle")}
        </p>
        <SurahGrid t={t} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Admin — Quran (read-only browse)                                    */
/* ------------------------------------------------------------------ */

export function AdminQuran({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Admin");

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("quranTitle")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("quranTitle") },
        ]}
      />
      <p className="text-sm text-muted">
        {t("quran")} — {t("quranTitle")}
      </p>
      <SurahGrid t={t} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Teacher — Quran & Hifz                                              */
/* ------------------------------------------------------------------ */

export function TeacherQuran({
  onNavigate,
}: {
  onNavigate: (view: DemoView) => void;
}) {
  const t = useTranslations("Teacher");

  // Group hifz overview — one row per student across the two hifz groups.
  const grouped = demoClassHifz.reduce<Record<string, typeof demoClassHifz>>(
    (acc, row) => {
      (acc[row.groupName] ??= []).push(row);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title={t("quranTitle")}
        breadcrumbs={[
          {
            label: t("overview"),
            onClick: () => onNavigate({ page: "overview" }),
          },
          { label: t("quranTitle") },
        ]}
      />

      {Object.entries(grouped).map(([groupName, rows]) => (
        <section key={groupName} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">{groupName}</h2>
            <span className="text-xs text-muted">{t("hifzProgress")}</span>
          </div>
          <div className="rounded-xl border border-card-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface/50 border-b border-card-border">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">
                    {t("overview")}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted">
                    {t("hifzProgress")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {rows.map((row) => {
                  const pct = Math.round(
                    (row.pagesMemorized / demoHifzStudent.totalPages) * 100,
                  );
                  return (
                    <tr key={row.studentId + row.groupName}>
                      <td className="px-4 py-3 font-medium">{row.fullName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-32 rounded-full bg-muted/20 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-success"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted tabular-nums whitespace-nowrap">
                            {row.pagesMemorized} {t("hifzPages")} {t("hifzOutOf")}{" "}
                            {demoHifzStudent.totalPages}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("quranTitle")}</h2>
        <SurahGrid t={t} />
      </section>
    </div>
  );
}
