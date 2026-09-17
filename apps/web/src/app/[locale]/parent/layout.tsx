import { getTranslations } from "next-intl/server";
import {
  LayoutDashboard,
  Heart,
  Megaphone,
  BookMarked,
  MessageSquare,
  Bell,
  Calendar,
  BookOpen,
} from "lucide-react";

import { requireParent } from "@/lib/auth";
import { PortalShell, type PortalNavItem } from "@/components/PortalShell";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireParent();
  const t = await getTranslations("Parent");

  const nav: PortalNavItem[] = [
    { href: "/parent", label: t("overview"), icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
    { href: "/parent/children", label: t("myChildren"), icon: <Heart className="h-4 w-4 shrink-0" /> },
    { href: "/parent/calendar", label: t("calendar"), icon: <Calendar className="h-4 w-4 shrink-0" />, plugin: "calendar" },
    { href: "/parent/lessons", label: t("lessonLibrary"), icon: <BookMarked className="h-4 w-4 shrink-0" />, plugin: "lesson_library" },
    { href: "/parent/messages", label: t("messages"), icon: <MessageSquare className="h-4 w-4 shrink-0" />, badgeKey: "messages" as const, plugin: "messaging" },
    { href: "/parent/notifications", label: t("notifications"), icon: <Bell className="h-4 w-4 shrink-0" />, badgeKey: "notifications" as const, plugin: "notifications" },
    { href: "/parent/announcements", label: t("announcements"), icon: <Megaphone className="h-4 w-4 shrink-0" />, plugin: "announcements" },
    { href: "/parent/quran", label: t("quran"), icon: <BookOpen className="h-4 w-4 shrink-0" />, plugin: "quran_hifz" },
  ];

  return (
    <PortalShell
      role="parent"
      namespace="Parent"
      roleName={t("parent")}
      userId={ctx.userId}
      mosqueId={ctx.mosqueId}
      mosqueName={ctx.mosqueName}
      nav={nav}
    >
      {children}
    </PortalShell>
  );
}
