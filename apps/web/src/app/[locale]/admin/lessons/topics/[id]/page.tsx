import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BookMarked } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";

import { ActionForm } from "@/components/ActionForm";
import { deleteTopic } from "../../actions";
import { toggleTopicPublished } from "../../../lessons/[id]/actions";
import { LessonCreateForm } from "../../lesson-create-form";
import { LessonReorderList } from "../../lesson-reorder-list";
import TopicEditForm from "../../TopicEditForm";

import { buttonVariants } from "@/components/ui/button";
export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "lesson_library", "/admin");
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const { data: topic } = await supabase
    .from("topics")
    .select("id, title, description, is_published")
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!topic) notFound();

  // Existing translations, so the edit form starts from what is stored.
  const { data: translationRows } = await supabase
    .from("topic_translations")
    .select("locale, title, description")
    .eq("topic_id", id)
    .eq("mosque_id", ctx.mosqueId);
  const initialTranslations: Record<string, { title: string; description: string }> = {};
  for (const r of translationRows ?? []) {
    initialTranslations[r.locale] = {
      title: r.title,
      description: r.description ?? "",
    };
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, body, sort_order")
    .eq("topic_id", id)
    .eq("mosque_id", ctx.mosqueId)
    .order("sort_order");

  const lessonList = lessons ?? [];

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<BookMarked className="h-5 w-5" />}
        title={topic.title}
        description={topic.description ?? undefined}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/lessons", label: t("lessonLibrary") },
          { label: topic.title },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <ActionForm action={toggleTopicPublished.bind(null, id, !!(topic.is_published))} successMessage="">
              <button type="submit" className={`text-xs rounded-full px-2.5 py-1 font-medium border transition-colors ${
                topic.is_published
                  ? "border-success/50 bg-success-subtle text-success-fg hover:bg-success-subtle"
                  : "border-card-border bg-card text-muted-foreground hover:bg-accent-subtle"
              }`}>
                {topic.is_published ? t("published") : t("draft")}
              </button>
            </ActionForm>
            <form action={deleteTopic}>
              <input type="hidden" name="topic_id" value={id} />
              <button
                type="submit"
                className={buttonVariants({ variant: "destructive", size: "sm" })}
              >
                {t("deleteTopic")}
              </button>
            </form>
          </div>
        }
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("editTopic")}</h2>
        <TopicEditForm
          topicId={topic.id}
          initialTitle={topic.title}
          initialDescription={topic.description}
          initialTranslations={initialTranslations}
        />
      </section>

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
        <LessonCreateForm topics={[{ id: topic.id, title: topic.title }]} defaultTopicId={id} mosqueId={ctx.mosqueId} />
      </section>
    </div>
  );
}
