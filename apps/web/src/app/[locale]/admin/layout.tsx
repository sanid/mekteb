import { getTranslations } from "next-intl/server";
import {
  LayoutDashboard,
  Calendar,
  Users,
  GraduationCap,
  BookOpen,
  Heart,
  BookMarked,
  Megaphone,
  MessageSquare,
  ClipboardCheck,
  Settings,
  Shield,
  PenLine,
  Building2,
  Inbox,
  BookHeart,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalShell, type PortalNavItem } from "@/components/PortalShell";
import { MosqueSwitcher } from "@/components/MosqueSwitcher";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAdmin();
  const t = await getTranslations("Admin");
  const supabase = await createClient();

  const [{ data: adminMemberships }, { data: subscription }] = await Promise.all([
    supabase
      .from("memberships")
      .select("mosque_id, mosques(id, name)")
      .eq("user_id", ctx.userId)
      .eq("role", "mosque_admin")
      .eq("is_active", true),
    supabase
      .from("mosque_subscriptions")
      .select("plan_id")
      .eq("mosque_id", ctx.mosqueId)
      .maybeSingle(),
  ]);

  const adminMosques = (adminMemberships ?? []).map((m) => {
    const mosque = m.mosques as { id: string; name: string } | null;
    return { id: m.mosque_id, name: mosque?.name ?? "Unknown" };
  });

  const isCommunityPlan = subscription?.plan_id === "community";

  const nav: PortalNavItem[] = [
    { href: "/admin", label: t("overview"), icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
    { href: "/admin/calendar", label: t("calendar"), icon: <Calendar className="h-4 w-4 shrink-0" />, plugin: "calendar" },
    { href: "/admin/groups", label: t("groups"), icon: <Users className="h-4 w-4 shrink-0" /> },
    { href: "/admin/students", label: t("students"), icon: <GraduationCap className="h-4 w-4 shrink-0" /> },
    { href: "/admin/teachers", label: t("teachers"), icon: <BookOpen className="h-4 w-4 shrink-0" /> },
    { href: "/admin/parents", label: t("parents"), icon: <Heart className="h-4 w-4 shrink-0" /> },
    { href: "/admin/enrollment", label: t("enrollmentRequests"), icon: <Inbox className="h-4 w-4 shrink-0" />, plugin: "enrollment" },
    { href: "/admin/lessons", label: t("lessons"), icon: <BookMarked className="h-4 w-4 shrink-0" />, plugin: "lesson_library" },
    { href: "/admin/exams", label: t("exams"), icon: <ClipboardCheck className="h-4 w-4 shrink-0" />, plugin: "exam_system" },
    { href: "/admin/tests/new", label: t("writtenTests"), icon: <PenLine className="h-4 w-4 shrink-0" />, plugin: "exam_system" },
    { href: "/admin/announcements", label: t("announcements"), icon: <Megaphone className="h-4 w-4 shrink-0" />, badgeKey: "notifications" as const, plugin: "announcements" },
    { href: "/admin/messages", label: t("messages"), icon: <MessageSquare className="h-4 w-4 shrink-0" />, badgeKey: "messages" as const, plugin: "messaging" },
    { href: "/admin/gdpr", label: t("gdpr"), icon: <Shield className="h-4 w-4 shrink-0" /> },
    { href: "/admin/settings", label: t("settings"), icon: <Settings className="h-4 w-4 shrink-0" /> },
    { href: "/admin/quran", label: t("quran"), icon: <BookHeart className="h-4 w-4 shrink-0" />, plugin: "quran_hifz" },
    ...(isCommunityPlan
      ? [{ href: "/admin/mosques", label: t("manageMosques"), icon: <Building2 className="h-4 w-4 shrink-0" /> }]
      : []),
  ];

  return (
    <PortalShell
      role="admin"
      namespace="Admin"
      roleName={t("admin")}
      userId={ctx.userId}
      mosqueId={ctx.mosqueId}
      mosqueName={ctx.mosqueName}
      nav={nav}
      aboveNav={
        adminMosques.length > 1 ? (
          <MosqueSwitcher mosques={adminMosques} activeMosqueId={ctx.mosqueId} />
        ) : undefined
      }
    >
      {children}
    </PortalShell>
  );
}
