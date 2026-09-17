"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  GraduationCap,
  BookOpen,
  Heart,
  BookMarked,
  Megaphone,
  MessageSquare,
  Bell,
  ClipboardList,
  Settings,
  LayoutDashboard,
  FileText,
  CalendarCheck,
  LogOut,
  Eye,
  Menu,
  Calendar,
  ClipboardCheck,
  Shield,
  PenLine,
  Building2,
  CreditCard,
} from "lucide-react";

import { Link } from "@/i18n/routing";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { MosqueIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import {
  type DemoRole,
  type DemoView,
  DEMO_MOSQUE_NAME,
  roleNavItems,
} from "@/lib/demo-data";

import {
  AdminOverview,
  AdminGroups,
  AdminGroupDetail,
  AdminStudents,
  AdminStudentDetail,
  AdminTeachers,
  AdminTeacherDetail,
  AdminParents,
  AdminParentDetail,
  AdminLessons,
  AdminAnnouncements,
  AdminMessages,
  AdminNotifications,
  AdminAudit,
  AdminSettings,
  AdminCalendar,
  AdminExams,
  AdminReport,
  AdminGdpr,
  AdminSecurity,
  AdminWrittenTests,
} from "@/components/demo/admin-views";

import {
  TeacherOverview,
  TeacherGroups,
  TeacherGroupDetail,
  TeacherLessons,
  TeacherExams,
  TeacherNotes,
  TeacherAnnouncements,
  TeacherMessages,
  TeacherNotifications,
  ParentOverview,
  ParentChildren,
  ParentChildDetail,
  ParentCalendar,
  ParentLessons,
  ParentAnnouncements,
  ParentMessages,
  ParentNotifications,
  StudentOverview,
  StudentHomework,
  StudentAttendance,
  StudentAnnouncements,
  StudentExams,
  StudentLessons,
  StudentNotifications,
  StudentQuran,
  StudentQuranSurah,
  StudentCalendar,
  ParentQuran,
  TeacherQuran,
  AdminQuran,
  ExaminerOverview,
  ExaminerExams,
  ExaminerWrittenTests,
  ExaminerMessages,
  ExaminerNotifications,
  PlatformAdminOverview,
  PlatformAdminMosques,
  PlatformAdminBilling,
  PlatformAdminGdpr,
} from "@/components/demo/other-views";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, GraduationCap, BookOpen, Heart, BookMarked,
  Megaphone, MessageSquare, Bell, ClipboardList, Settings, FileText, CalendarCheck,
  Calendar, ClipboardCheck, Shield, PenLine, Building2, CreditCard,
};

const ROLE_COLORS: Record<DemoRole, string> = {
  admin: "bg-info-subtle text-info-fg",
  teacher: "bg-accent-subtle text-accent",
  parent: "bg-danger-subtle text-danger-fg",
  student: "bg-warning-subtle text-warning-fg",
  examiner: "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400",
  "platform-admin": "bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400",
};

function renderContent(role: DemoRole, view: DemoView, nav: (v: DemoView) => void) {
  if (role === "admin") {
    switch (view.page) {
      case "groups": return <AdminGroups onNavigate={nav} />;
      case "group-detail": return <AdminGroupDetail groupId={view.id} onNavigate={nav} />;
      case "students": return <AdminStudents onNavigate={nav} />;
      case "student-detail": return <AdminStudentDetail studentId={view.id} onNavigate={nav} />;
      case "teachers": return <AdminTeachers onNavigate={nav} />;
      case "teacher-detail": return <AdminTeacherDetail teacherId={view.id} onNavigate={nav} />;
      case "parents": return <AdminParents onNavigate={nav} />;
      case "parent-detail": return <AdminParentDetail parentId={view.id} onNavigate={nav} />;
      case "lessons": return <AdminLessons onNavigate={nav} />;
      case "admin-quran": return <AdminQuran onNavigate={nav} />;
      case "announcements": return <AdminAnnouncements onNavigate={nav} />;
      case "messages": return <AdminMessages onNavigate={nav} />;
      case "notifications": return <AdminNotifications onNavigate={nav} />;
      case "audit": return <AdminAudit onNavigate={nav} />;
      case "settings": return <AdminSettings onNavigate={nav} />;
      case "calendar": return <AdminCalendar onNavigate={nav} />;
      case "exams": return <AdminExams onNavigate={nav} />;
      case "report": return <AdminReport onNavigate={nav} />;
      case "gdpr": return <AdminGdpr onNavigate={nav} />;
      case "security": return <AdminSecurity onNavigate={nav} />;
      case "written-tests": return <AdminWrittenTests onNavigate={nav} />;
      default: return <AdminOverview onNavigate={nav} />;
    }
  }
  if (role === "teacher") {
    switch (view.page) {
      case "groups": return <TeacherGroups onNavigate={nav} />;
      case "group-detail": return <TeacherGroupDetail groupId={view.id} onNavigate={nav} />;
      case "teacher-lessons": return <TeacherLessons onNavigate={nav} />;
      case "teacher-exams": return <TeacherExams onNavigate={nav} />;
      case "notes": return <TeacherNotes onNavigate={nav} />;
      case "teacher-quran": return <TeacherQuran onNavigate={nav} />;
      case "announcements": return <TeacherAnnouncements onNavigate={nav} />;
      case "messages": return <TeacherMessages onNavigate={nav} />;
      case "notifications": return <TeacherNotifications onNavigate={nav} />;
      default: return <TeacherOverview onNavigate={nav} />;
    }
  }
  if (role === "parent") {
    switch (view.page) {
      case "children": return <ParentChildren onNavigate={nav} />;
      case "child-detail": return <ParentChildDetail studentId={view.id} onNavigate={nav} />;
      case "parent-calendar": return <ParentCalendar onNavigate={nav} />;
      case "lessons": return <ParentLessons onNavigate={nav} />;
      case "parent-quran": return <ParentQuran onNavigate={nav} />;
      case "announcements": return <ParentAnnouncements onNavigate={nav} />;
      case "messages": return <ParentMessages onNavigate={nav} />;
      case "notifications": return <ParentNotifications onNavigate={nav} />;
      default: return <ParentOverview onNavigate={nav} />;
    }
  }
  if (role === "student") {
    switch (view.page) {
      case "homework": return <StudentHomework onNavigate={nav} />;
      case "attendance": return <StudentAttendance onNavigate={nav} />;
      case "student-exams": return <StudentExams onNavigate={nav} />;
      case "student-lessons": return <StudentLessons onNavigate={nav} />;
      case "student-quran": return <StudentQuran onNavigate={nav} />;
      case "student-quran-surah": return <StudentQuranSurah surahId={view.id} onNavigate={nav} />;
      case "student-calendar": return <StudentCalendar onNavigate={nav} />;
      case "announcements": return <StudentAnnouncements onNavigate={nav} />;
      case "student-notifications": return <StudentNotifications onNavigate={nav} />;
      default: return <StudentOverview onNavigate={nav} />;
    }
  }
  if (role === "examiner") {
    switch (view.page) {
      case "exams": return <ExaminerExams onNavigate={nav} />;
      case "examiner-written-tests": return <ExaminerWrittenTests onNavigate={nav} />;
      case "messages": return <ExaminerMessages onNavigate={nav} />;
      case "notifications": return <ExaminerNotifications onNavigate={nav} />;
      default: return <ExaminerOverview onNavigate={nav} />;
    }
  }
  if (role === "platform-admin") {
    switch (view.page) {
      case "platform-admin-mosques": return <PlatformAdminMosques onNavigate={nav} />;
      case "platform-admin-billing": return <PlatformAdminBilling onNavigate={nav} />;
      case "platform-admin-gdpr": return <PlatformAdminGdpr onNavigate={nav} />;
      default: return <PlatformAdminOverview onNavigate={nav} />;
    }
  }
  return null;
}

export default function DemoPage() {
  const [role, setRole] = useState<DemoRole>("admin");
  const [view, setView] = useState<DemoView>({ page: "overview" });
  const [mobileOpen, setMobileOpen] = useState(false);
  const tDemo = useTranslations("Demo");
  const tNamespace = useTranslations(
    role === "admin"
      ? "Admin"
      : role === "teacher"
      ? "Teacher"
      : role === "parent"
      ? "Parent"
      : role === "student"
      ? "Student"
      : role === "examiner"
      ? "Examiner"
      : "PlatformAdmin"
  );

  const nav = roleNavItems[role];
  const roleLabel = tDemo(role);

  function navigate(v: DemoView) {
    setView(v);
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }

  function handleRoleSwitch(r: DemoRole) {
    setRole(r);
    setView({ page: "overview" });
    setMobileOpen(false);
  }

  const sidebarBrand = (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <MosqueIcon className="h-6 w-6 text-accent" />
        <span className="font-bold tracking-tight">Mekteb</span>
      </div>
      <div className="text-xs uppercase tracking-wide text-muted">{roleLabel}</div>
      <div className="font-semibold text-sm truncate">{DEMO_MOSQUE_NAME}</div>
    </div>
  );

  const sidebarNav = (
    <nav className="space-y-1">
      {nav.map(({ labelKey, iconType, page }) => {
        const Icon = iconMap[iconType] ?? LayoutDashboard;
        const label = tNamespace(labelKey);
        const isActive = view.page === page || (page === "overview" && view.page === "overview" && labelKey === "overview");
        return (
          <button
            key={labelKey}
            onClick={() => navigate({ page } as DemoView)}
            className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left ${
              isActive
                ? "bg-accent-subtle text-accent font-medium"
                : "text-muted hover:bg-accent-subtle hover:text-accent"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
          </button>
        );
      })}
    </nav>
  );

  const sidebarFooter = (
    <div className="pt-4 border-t border-card-border space-y-2">
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" />
        {tDemo("exitDemo")}
      </Link>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Demo Banner */}
      <div className="bg-warning text-black px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4" />
          <span>{tDemo("banner")}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium opacity-80">{tDemo("switchRole")}:</span>
          <div className="flex rounded-lg overflow-hidden border border-black/20">
            {(["admin", "teacher", "parent", "student", "examiner", "platform-admin"] as DemoRole[]).map((r) => (
              <button
                key={r}
                onClick={() => handleRoleSwitch(r)}
                className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                  role === r ? "bg-black text-white" : "hover:bg-black/10"
                }`}
              >
                {tDemo(r)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden sm:flex w-60 flex-col border-r border-card-border bg-surface p-4 h-screen sticky top-0">
          <div className="mb-6">{sidebarBrand}</div>
          <div className="flex-1 overflow-y-auto">{sidebarNav}</div>
          {sidebarFooter}
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="sm:hidden sticky top-0 z-10 flex items-center justify-between border-b border-card-border bg-background/80 backdrop-blur-md px-3 py-2">
            <div className="flex items-center gap-1 min-w-0">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger
                  render={
                    <Button variant="ghost" size="icon" aria-label="Open navigation">
                      <Menu className="h-5 w-5" />
                    </Button>
                  }
                />
                <SheetContent side="left" className="w-72 p-0 flex flex-col bg-surface">
                  <div className="border-b border-card-border p-4">{sidebarBrand}</div>
                  <div
                    className="flex-1 overflow-y-auto p-3"
                    onClick={(e) => { if ((e.target as HTMLElement).closest("a, button")) setMobileOpen(false); }}
                  >
                    {sidebarNav}
                    <div className="mt-4">{sidebarFooter}</div>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="font-semibold text-sm truncate">{DEMO_MOSQUE_NAME}</div>
            </div>
            <div className="flex items-center gap-1">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[role]}`}>
                {roleLabel}
              </span>
              <ThemeToggle />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {renderContent(role, view, navigate)}
          </main>
        </div>
      </div>
    </div>
  );
}
