import { GraduationCap } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { PageHeader } from "@/components/PageHeader";

import { StudentListClient } from "./StudentListClient";
import { buttonVariants } from "@/components/ui/button";

export default async function StudentsPage() {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const [{ data: students }, { data: links }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, date_of_birth, is_active, created_at")
      .eq("mosque_id", ctx.mosqueId)
      .order("full_name"),
    supabase
      .from("parent_student_links")
      .select("id, student_profile_id, parent_profiles(id, relation, profiles(full_name, display_name))")
      .eq("mosque_id", ctx.mosqueId),
  ]);

  const parentsByStudent = new Map<string, string[]>();
  for (const l of links ?? []) {
    const parent = l.parent_profiles as {
      profiles: { full_name: string | null; display_name: string | null } | null;
    } | null;
    const name = parent?.profiles?.display_name ?? parent?.profiles?.full_name;
    if (!name) continue;
    const list = parentsByStudent.get(l.student_profile_id) ?? [];
    list.push(name);
    parentsByStudent.set(l.student_profile_id, list);
  }

  const mappedStudents = (students ?? []).map(s => ({
    ...s,
    parentNames: parentsByStudent.get(s.id) ?? []
  }));

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<GraduationCap className="h-5 w-5" />}
        title={t("students")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("students") },
        ]}
        actions={
          <Link
            href="/admin/students/new"
            className={buttonVariants({ size: "xl" })}
          >
            {t("addStudentWithLogin")}
          </Link>
        }
      />

      <StudentListClient initialStudents={mappedStudents} />
    </div>
  );
}
