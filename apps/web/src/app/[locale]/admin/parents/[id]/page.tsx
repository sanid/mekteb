import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Heart } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import { getTranslatedRelation } from "@/lib/relations";
import { LinkedStudentsClient } from "./LinkedStudentsClient";

import { updateParentProfile } from "./actions";
import { ParentActions } from "./ParentActions";
import { buttonVariants } from "@/components/ui/button";

import { inputCls } from "@/components/FormField";
type PageProps = { params: Promise<{ locale: string; id: string }> };

export default async function ParentDetailPage({ params }: PageProps) {
  const { id: parentId, locale } = await params;
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const [{ data: parent }, { data: links }, { data: allStudents }] = await Promise.all([
    supabase
      .from("parent_profiles")
      .select("id, relation, is_active, profile_id, profiles(full_name, display_name, phone)")
      .eq("id", parentId)
      .eq("mosque_id", ctx.mosqueId)
      .maybeSingle(),
    supabase
      .from("parent_student_links")
      .select("id, student_profiles(id, full_name)")
      .eq("parent_profile_id", parentId)
      .eq("mosque_id", ctx.mosqueId),
    supabase
      .from("student_profiles")
      .select("id, full_name")
      .eq("mosque_id", ctx.mosqueId)
      .order("full_name"),
  ]);

  if (!parent) notFound();

  const profile = parent.profiles as {
    full_name: string | null;
    display_name: string | null;
    phone: string | null;
  } | null;

  const updateAction = updateParentProfile.bind(null, parentId);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Heart className="h-5 w-5" />}
        title={profile?.display_name ?? profile?.full_name ?? t("noName")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/parents", label: t("parents") },
          { label: profile?.display_name ?? profile?.full_name ?? t("noName") },
        ]}
        actions={
          <ParentActions
            parentId={parentId}
            deleteLabel={t("deleteParent")}
            confirmDelete={t("confirmDeleteParent")}
            cancelLabel={t("cancel")}
            parentsPath="/admin/parents"
          />
        }
      />

      {!parent.is_active ? (
        <span className="inline-block text-xs rounded-full bg-warning-subtle px-2.5 py-0.5 text-warning-fg">
          {t("inactive")}
        </span>
      ) : null}

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
            <span className="text-sm font-medium">{t("relation")}</span>
            <select
              name="relation"
              defaultValue={parent.relation ?? ""}
              className={inputCls}
            >
              <option value="">{t("selectRelation")}</option>
              <option value="father">{getTranslatedRelation("father", locale)}</option>
              <option value="mother">{getTranslatedRelation("mother", locale)}</option>
              <option value="guardian">{getTranslatedRelation("guardian", locale)}</option>
              <option value="parent">{getTranslatedRelation("parent", locale)}</option>
              {parent.relation && !["father", "mother", "guardian", "parent"].includes(parent.relation.toLowerCase()) && (
                <option value={parent.relation}>
                  {parent.relation}
                </option>
              )}
            </select>
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

      <LinkedStudentsClient
        parentId={parentId}
        initialLinkedStudents={(links ?? []).map((link) => {
          const child = link.student_profiles as { id: string; full_name: string } | null;
          return {
            linkId: link.id,
            studentProfileId: child?.id ?? "",
            name: child?.full_name ?? t("noName"),
          };
        })}
        allStudents={(allStudents ?? []).map((s) => ({
          id: s.id,
          name: s.full_name,
        }))}
      />
    </div>
  );
}
