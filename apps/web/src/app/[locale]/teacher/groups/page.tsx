import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { listCard } from "@/components/ui/surfaces";

export default async function TeacherGroupsPage() {
  const ctx = await requireTeacher();
  const t = await getTranslations("Teacher");
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("teacher_group_links")
    .select("group_id, groups(id, name, description)")
    .eq("teacher_profile_id", ctx.teacherProfileId)
    .eq("is_active", true);

  const groups = (links ?? [])
    .map(
      (l) =>
        l.groups as {
          id: string;
          name: string;
          description: string | null;
        } | null,
    )
    .filter((g): g is NonNullable<typeof g> => g !== null);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title={t("myGroups")}
        breadcrumbs={[
          { href: "/teacher", label: t("overview") },
          { label: t("myGroups") },
        ]}
      />
      <ul className={listCard}>
        {groups.map((g) => (
          <li key={g.id}>
            <Link
              href={`/teacher/groups/${g.id}`}
              className="block p-4 transition-colors hover:bg-accent-subtle"
            >
              <div className="font-medium">{g.name}</div>
              {g.description ? (
                <div className="text-sm text-muted">
                  {g.description}
                </div>
              ) : null}
            </Link>
          </li>
        ))}
        {groups.length === 0 ? (
          <li className="p-4 text-sm text-muted">
            {t("noGroupsAssigned")}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
