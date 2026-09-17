import { getTranslations } from "next-intl/server";
import {
  LayoutDashboard,
  ClipboardCheck,
  MessageSquare,
  Bell,
  FileText,
  CalendarRange,
} from "lucide-react";

import { requireExaminer } from "@/lib/auth";
import { PortalShell, type PortalNavItem } from "@/components/PortalShell";

export default async function ExaminerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireExaminer();
  const t = await getTranslations("Examiner");

  // The overview deliberately carries no plugin gate: it is the portal's own
  // home, and hiding it would leave the sidebar with no way back.
  const nav: PortalNavItem[] = [
    { href: "/examiner", label: t("overview"), icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
    { href: "/examiner/calendar", label: t("calendar"), icon: <CalendarRange className="h-4 w-4 shrink-0" />, plugin: "calendar" },
    { href: "/examiner/exams", label: t("recentExams"), icon: <ClipboardCheck className="h-4 w-4 shrink-0" />, plugin: "exam_system" },
    { href: "/examiner/tests/new", label: t("writtenTests"), icon: <FileText className="h-4 w-4 shrink-0" />, plugin: "exam_system" },
    { href: "/examiner/messages", label: t("messages"), icon: <MessageSquare className="h-4 w-4 shrink-0" />, badgeKey: "messages" as const, plugin: "messaging" },
    { href: "/examiner/notifications", label: t("notifications"), icon: <Bell className="h-4 w-4 shrink-0" />, badgeKey: "notifications" as const, plugin: "notifications" },
  ];

  return (
    <PortalShell
      role="examiner"
      namespace="Examiner"
      roleName={t("examiner")}
      userId={ctx.userId}
      mosqueId={ctx.mosqueId}
      mosqueName={ctx.mosqueName}
      nav={nav}
    >
      {children}
    </PortalShell>
  );
}
