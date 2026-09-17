import { getTranslations } from "next-intl/server";
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  CalendarRange,
  Megaphone,
  ClipboardCheck,
  BookMarked,
  Bell,
  NotebookPen,
} from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { PortalShell, type PortalNavItem } from "@/components/PortalShell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireStudent();
  const t = await getTranslations("Student");

  const nav: PortalNavItem[] = [
    { href: "/student", label: t("overview"), icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
    { href: "/student/homework", label: t("homework"), icon: <BookOpen className="h-4 w-4 shrink-0" /> },
    { href: "/student/attendance", label: t("attendance"), icon: <CalendarCheck className="h-4 w-4 shrink-0" /> },
    { href: "/student/calendar", label: t("calendar"), icon: <CalendarRange className="h-4 w-4 shrink-0" />, plugin: "calendar" },
    { href: "/student/exams", label: t("upcomingExams"), icon: <ClipboardCheck className="h-4 w-4 shrink-0" />, plugin: "exam_system" },
    { href: "/student/lessons", label: t("lessonLibrary"), icon: <BookMarked className="h-4 w-4 shrink-0" />, plugin: "lesson_library" },
    { href: "/student/announcements", label: t("announcements"), icon: <Megaphone className="h-4 w-4 shrink-0" />, plugin: "announcements" },
    { href: "/student/notifications", label: t("notifications"), icon: <Bell className="h-4 w-4 shrink-0" />, badgeKey: "notifications" as const, plugin: "notifications" },
    { href: "/student/progress-notes", label: t("myProgressNotes"), icon: <NotebookPen className="h-4 w-4 shrink-0" /> },
    { href: "/student/weekly-notes", label: t("weeklyNotes"), icon: <CalendarRange className="h-4 w-4 shrink-0" /> },
    { href: "/student/quran", label: t("quran"), icon: <BookOpen className="h-4 w-4 shrink-0" />, plugin: "quran_hifz" },
  ];

  return (
    <PortalShell
      role="student"
      namespace="Student"
      roleName={t("student")}
      userId={ctx.userId}
      mosqueId={ctx.mosqueId}
      mosqueName={ctx.mosqueName}
      nav={nav}
    >
      {children}
    </PortalShell>
  );
}
