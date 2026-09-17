import { getTranslations } from "next-intl/server";
import { Heart } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ParentListClient } from "./ParentListClient";
import { buttonVariants } from "@/components/ui/button";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function ParentsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const [{ data: parents }, { data: links }] = await Promise.all([
    supabase
      .from("parent_profiles")
      .select("id, relation, is_active, profiles(full_name, display_name)")
      .eq("mosque_id", ctx.mosqueId),
    supabase
      .from("parent_student_links")
      .select("id, parent_profile_id, student_profiles(full_name)")
      .eq("mosque_id", ctx.mosqueId),
  ]);

  const studentsByParent = new Map<string, string[]>();
  for (const l of links ?? []) {
    const name = (l.student_profiles as { full_name: string } | null)?.full_name;
    if (!name) continue;
    const list = studentsByParent.get(l.parent_profile_id) ?? [];
    list.push(name);
    studentsByParent.set(l.parent_profile_id, list);
  }

  const mappedParents = (parents ?? []).map(p => ({
    ...p,
    studentNames: studentsByParent.get(p.id) ?? []
  }));

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Heart className="h-5 w-5" />}
        title={t("parents")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("parents") },
        ]}
        actions={
          <Link
            href="/admin/parents/new"
            className={buttonVariants({ size: "xl" })}
          >
            {t("addParent")}
          </Link>
        }
      />

      <ParentListClient initialParents={mappedParents} locale={locale} />
    </div>
  );
}
