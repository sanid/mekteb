import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { TeacherListClient } from "./TeacherListClient";
import { buttonVariants } from "@/components/ui/button";

type PageProps = { searchParams: Promise<{ q?: string }> };

export default async function TeachersPage({ searchParams }: PageProps) {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const { data: teachers } = await supabase
    .from("teacher_profiles")
    .select("id, profile_id, bio, is_active, profiles(full_name, display_name)")
    .eq("mosque_id", ctx.mosqueId);

  const { data: extraRoles } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true)
    .in("role", ["examiner", "assistant"]);

  const rolesByUser = new Map<string, Set<string>>();
  for (const m of extraRoles ?? []) {
    if (!rolesByUser.has(m.user_id)) rolesByUser.set(m.user_id, new Set());
    rolesByUser.get(m.user_id)!.add(m.role);
  }

  const mappedTeachers = (teachers ?? []).map(row => {
    const roles = rolesByUser.get(row.profile_id) ?? new Set<string>();
    return {
      ...row,
      roles: Array.from(roles)
    };
  });

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title={t("teachers")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("teachers") },
        ]}
        actions={
          <Link
            href="/admin/teachers/new"
            className={buttonVariants({ size: "xl" })}
          >
            {t("addTeacher")}
          </Link>
        }
      />

      <TeacherListClient initialTeachers={mappedTeachers} />
    </div>
  );
}
