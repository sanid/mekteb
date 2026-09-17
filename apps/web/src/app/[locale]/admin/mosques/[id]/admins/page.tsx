import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Building2, Shield } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { FormCard } from "@/components/FormField";
import { CollapsibleAddCard } from "@/components/CollapsibleAddCard";
import { removeAdmin } from "../../actions";
import { AppointAdminForm } from "./AppointAdminForm";
import { listCard } from "@/components/ui/surfaces";

import { buttonVariants } from "@/components/ui/button";
type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MosqueAdminsPage({ params }: PageProps) {
  const { id: mosqueId } = await params;
  const ctx = await requireAdmin();
  const t = await getTranslations("Admin");
  const supabase = await createClient();

  // Security: verify calling user is admin of THAT mosque
  const { data: authCheck } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("mosque_id", mosqueId)
    .eq("role", "mosque_admin")
    .eq("is_active", true)
    .maybeSingle();

  if (!authCheck) notFound();

  // Fetch mosque details
  const { data: mosque } = await supabase
    .from("mosques")
    .select("id, name, slug")
    .eq("id", mosqueId)
    .maybeSingle();

  if (!mosque) notFound();

  // Fetch all active admins
  const { data: adminMemberships } = await supabase
    .from("memberships")
    .select("id, user_id")
    .eq("mosque_id", mosqueId)
    .eq("role", "mosque_admin")
    .eq("is_active", true)
    .order("created_at");

  const adminUserIds = (adminMemberships ?? []).map((m) => m.user_id);

  // Fetch profiles for those users
  const { data: profileRows } =
    adminUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, display_name")
          .in("id", adminUserIds)
      : { data: [] };

  const profileMap = new Map(
    (profileRows ?? []).map((p) => [p.id, p]),
  );

  const admins = (adminMemberships ?? []).map((m) => {
    const profile = profileMap.get(m.user_id);
    return {
      membershipId: m.id,
      userId: m.user_id,
      name: profile?.display_name ?? profile?.full_name ?? "Unknown",
      isSelf: m.user_id === ctx.userId,
    };
  });

  const removeAdminBound = removeAdmin;

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Building2 className="h-5 w-5" />}
        title={mosque.name}
        description={t("manageMosqueAdmins")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/mosques", label: t("manageMosques") },
          { label: mosque.name },
        ]}
      />

      {/* Current admins list */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted" />
          <h2 className="text-base font-semibold tracking-tight">
            {t("currentAdmins")}
          </h2>
        </div>

        {admins.length === 0 ? (
          <p className="text-sm text-muted">
            {t("noOtherAdmins")}
          </p>
        ) : (
          <ul className={listCard}>
            {admins.map((admin) => (
              <li
                key={admin.membershipId}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent text-sm font-semibold">
                    {admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{admin.name}</p>
                    {admin.isSelf && (
                      <p className="text-xs text-muted">
                        {t("activeMosque")} ({t("admin")})
                      </p>
                    )}
                  </div>
                </div>
                {!admin.isSelf && (
                  <ActionForm
                    action={removeAdminBound}
                    successMessage={t("adminRemoved")}
                  >
                    <input type="hidden" name="mosque_id" value={mosqueId} />
                    <input type="hidden" name="user_id" value={admin.userId} />
                    <button
                      type="submit"
                      className={buttonVariants({ variant: "destructive", size: "sm" })}
                    >
                      {t("removeAdmin")}
                    </button>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Appoint new admin */}
      <section className="space-y-4">
        <CollapsibleAddCard
          buttonLabel={t("appointAdmin")}
        >
          <FormCard
            title={t("appointAdminByEmail")}
          >
            <AppointAdminForm mosqueId={mosqueId} />
          </FormCard>
        </CollapsibleAddCard>
      </section>
    </div>
  );
}
