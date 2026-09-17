import { getTranslations } from "next-intl/server";
import {
  LayoutDashboard,
  Users,
  CalendarRange,
  Megaphone,
  FileText,
  MessageSquare,
  Bell,
  BookMarked,
  ClipboardCheck,
  BookOpen,
} from "lucide-react";

import { requireTeacher } from "@/lib/auth";
import { PortalShell, type PortalNavItem } from "@/components/PortalShell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTeacher();
  const t = await getTranslations("Teacher");

  const nav: PortalNavItem[] = [
    { href: "/teacher", label: t("overview"), icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
    { href: "/teacher/groups", label: t("myGroups"), icon: <Users className="h-4 w-4 shrink-0" /> },
    { href: "/teacher/calendar", label: t("calendar"), icon: <CalendarRange className="h-4 w-4 shrink-0" />, plugin: "calendar" },
    { href: "/teacher/lessons", label: t("lessonLibrary"), icon: <BookMarked className="h-4 w-4 shrink-0" />, plugin: "lesson_library" },
    { href: "/teacher/exams", label: t("recentExamResults"), icon: <ClipboardCheck className="h-4 w-4 shrink-0" />, plugin: "exam_system" },
    { href: "/teacher/notes", label: t("allNotes"), icon: <FileText className="h-4 w-4 shrink-0" /> },
    { href: "/teacher/messages", label: t("messages"), icon: <MessageSquare className="h-4 w-4 shrink-0" />, badgeKey: "messages" as const, plugin: "messaging" },
    { href: "/teacher/notifications", label: t("notifications"), icon: <Bell className="h-4 w-4 shrink-0" />, badgeKey: "notifications" as const, plugin: "notifications" },
    { href: "/teacher/announcements", label: t("announcements"), icon: <Megaphone className="h-4 w-4 shrink-0" />, plugin: "announcements" },
    { href: "/teacher/quran", label: t("quran"), icon: <BookOpen className="h-4 w-4 shrink-0" />, plugin: "quran_hifz" },
  ];

  return (
    <PortalShell
      role="teacher"
      namespace="Teacher"
      roleName={t("teacher")}
      userId={ctx.userId}
      mosqueId={ctx.mosqueId}
      mosqueName={ctx.mosqueName}
      nav={nav}
    >
      {children}
    </PortalShell>
  );
}
