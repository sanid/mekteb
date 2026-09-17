import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BookOpen, ShieldCheck, HandHelping } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";

import { updateTeacherProfile, toggleExaminerRole, toggleAssistantRole } from "./actions";
import { TeacherActions } from "./TeacherActions";
import { buttonVariants } from "@/components/ui/button";

import { inputCls } from "@/components/FormField";
type PageProps = { params: Promise<{ id: string }> };

export default async function TeacherDetailPage({ params }: PageProps) {
  const { id: teacherId } = await params;
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("id, bio, is_active, profile_id, profiles(full_name, display_name, phone)")
    .eq("id", teacherId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!teacher) notFound();

  const { data: examinerMembership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", teacher.profile_id)
    .eq("mosque_id", ctx.mosqueId)
    .eq("role", "examiner")
    .maybeSingle();

  const isExaminer = !!examinerMembership;

  const { data: assistantMembership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", teacher.profile_id)
    .eq("mosque_id", ctx.mosqueId)
    .eq("role", "assistant")
    .maybeSingle();

  const isAssistant = !!assistantMembership;

  const profile = teacher.profiles as {
    full_name: string | null;
    display_name: string | null;
    phone: string | null;
  } | null;

  const updateAction = updateTeacherProfile.bind(null, teacherId);
  const examinerAction = toggleExaminerRole.bind(null, teacherId);
  const assistantAction = toggleAssistantRole.bind(null, teacherId);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title={profile?.display_name ?? profile?.full_name ?? t("noName")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/teachers", label: t("teachers") },
          { label: profile?.display_name ?? profile?.full_name ?? t("noName") },
        ]}
        actions={
          <TeacherActions
            teacherId={teacherId}
            deleteLabel={t("deleteTeacher")}
            confirmDelete={t("confirmDeleteTeacher")}
            cancelLabel={t("cancel")}
            teachersPath="/admin/teachers"
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {!teacher.is_active ? (
          <span className="inline-block text-xs rounded-full bg-warning-subtle px-2.5 py-0.5 text-warning-fg">
            {t("inactive")}
          </span>
        ) : null}
        {isExaminer ? (
          <span className="inline-flex items-center gap-1 text-xs rounded-full bg-accent-subtle px-2.5 py-0.5 font-semibold text-accent">
            <ShieldCheck className="h-3 w-3" />
            {t("examinerBadge")}
          </span>
        ) : null}
        {isAssistant ? (
          <span className="inline-flex items-center gap-1 text-xs rounded-full bg-info-subtle px-2.5 py-0.5 text-info-fg">
            <HandHelping className="h-3 w-3" />
            {t("assistantBadge")}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ActionForm
          action={examinerAction}
          successMessage={isExaminer ? t("examinerDemoted") : t("examinerPromoted")}
          className="rounded-xl border border-card-border bg-card p-5"
        >
          <button
            type="submit"
            className={buttonVariants({ variant: isExaminer ? "outline" : "default" })}
          >
            <ShieldCheck className="h-4 w-4" />
            {isExaminer ? t("demoteExaminer") : t("promoteToExaminer")}
          </button>
        </ActionForm>

        <ActionForm
          action={assistantAction}
          successMessage={isAssistant ? t("assistantDemoted") : t("assistantPromoted")}
          className="rounded-xl border border-card-border bg-card p-5"
        >
          <button
            type="submit"
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
              isAssistant
                ? "bg-warning hover:bg-warning/90"
                : "bg-info hover:bg-info/90"
            }`}
          >
            <HandHelping className="h-4 w-4" />
            {isAssistant ? t("demoteAssistant") : t("promoteToAssistant")}
          </button>
        </ActionForm>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("editProfile")}</h2>
        <ActionForm
          action={updateAction}
          successMessage={t("profileSaved")}
          className="space-y-4 rounded-xl border border-card-border bg-card p-6"
        >
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("fullName")}</span>
            <input
              name="full_name"
              required
              defaultValue={profile?.full_name ?? ""}
              className={inputCls}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("displayNameOpt")}</span>
            <input
              name="display_name"
              defaultValue={profile?.display_name ?? ""}
              className={inputCls}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("phone")}</span>
            <input
              type="tel"
              name="phone"
              defaultValue={profile?.phone ?? ""}
              className={inputCls}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("bioOpt")}</span>
            <textarea
              name="bio"
              rows={3}
              defaultValue={teacher.bio ?? ""}
              className={inputCls}
            />
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className={buttonVariants({ size: "xl" })}
            >
              {t("saveChanges")}
            </button>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
