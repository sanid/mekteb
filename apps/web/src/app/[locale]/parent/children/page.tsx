import { getTranslations } from "next-intl/server";
import { Heart } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { listCard } from "@/components/ui/surfaces";

export default async function ParentChildrenList() {
  const ctx = await requireParent();
  const t = await getTranslations("Parent");
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("parent_student_links")
    .select("id, student_profile_id, student_profiles(id, full_name)")
    .eq("parent_profile_id", ctx.parentProfileId);

  const children = (links ?? [])
    .map(
      (l) =>
        l.student_profiles as { id: string; full_name: string } | null,
    )
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<Heart className="h-5 w-5" />}
        title={t("myChildren")}
        breadcrumbs={[
          { href: "/parent", label: t("overview") },
          { label: t("myChildren") },
        ]}
      />
      <ul className={listCard}>
        {children.map((c) => (
          <li key={c.id}>
            <Link
              href={`/parent/children/${c.id}`}
              className="block p-4 transition-colors hover:bg-accent-subtle"
            >
              <div className="font-medium">{c.full_name}</div>
            </Link>
          </li>
        ))}
        {children.length === 0 ? (
          <li className="p-4 text-sm text-muted">{t("noChildrenLinked")}</li>
        ) : null}
      </ul>
    </div>
  );
}
