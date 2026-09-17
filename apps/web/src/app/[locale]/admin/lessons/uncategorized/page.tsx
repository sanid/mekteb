import { getTranslations } from "next-intl/server";

import { BookMarked } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";

import { LessonCreateForm } from "../lesson-create-form";
import { LessonReorderList } from "../lesson-reorder-list";

export default async function UncategorizedLessonsPage() {
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "lesson_library", "/admin");
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, body, sort_order")
    .eq("mosque_id", ctx.mosqueId)
    .is("topic_id", null)
    .order("sort_order");

  const lessonList = lessons ?? [];

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<BookMarked className="h-5 w-5" />}
        title={t("uncategorized")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/lessons", label: t("lessonLibrary") },
          { label: t("uncategorized") },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("lessons")}</h2>
        <LessonReorderList lessons={lessonList} />
        {lessonList.length === 0 ? (
          <p className="text-sm text-muted p-4 rounded-xl border border-card-border">
            {t("noLessons")}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("addLesson")}</h2>
        <LessonCreateForm topics={[]} mosqueId={ctx.mosqueId} />
      </section>
    </div>
  );
}
