import { getTranslations } from "next-intl/server";
import { BookMarked } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireParent } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { extractPlainText } from "@/lib/blocknote-utils";
import { PageHeader } from "@/components/PageHeader";
import { listCard } from "@/components/ui/surfaces";

export default async function ParentLessonsPage() {
  const ctx = await requireParent();
  await requirePlugin(ctx.mosqueId, "lesson_library", "/parent");
  const supabase = await createClient();
  const t = await getTranslations("Parent");

  const [{ data: topics }, { data: lessons }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title, description, sort_order")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_published", true)
      .order("sort_order"),
    supabase
      .from("lessons")
      .select("id, title, body, topic_id, sort_order, topics(title)")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_published", true)
      .order("sort_order"),
  ]);

  // Group lessons by topic_id
  const lessonsByTopic = new Map<string | null, typeof lessons>([
    [null, []],
  ]);
  for (const topic of topics ?? []) {
    lessonsByTopic.set(topic.id, []);
  }
  for (const lesson of lessons ?? []) {
    const key = lesson.topic_id ?? null;
    if (!lessonsByTopic.has(key)) lessonsByTopic.set(key, []);
    lessonsByTopic.get(key)!.push(lesson);
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<BookMarked className="h-5 w-5" />}
        title={t("lessonLibrary")}
        breadcrumbs={[
          { href: "/parent", label: t("overview") },
          { label: t("lessonLibrary") },
        ]}
      />

      {(topics ?? []).map((topic) => {
        const topicLessons = lessonsByTopic.get(topic.id) ?? [];
        if (topicLessons.length === 0) return null;
        return (
          <section key={topic.id} className="space-y-2">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{topic.title}</h2>
              {topic.description ? (
                <p className="text-sm text-muted">{topic.description}</p>
              ) : null}
            </div>
            <ul className={listCard}>
              {topicLessons.map((lesson) => {
                const preview = extractPlainText(lesson.body);
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/parent/lessons/${lesson.id}`}
                      className="block p-4 transition-colors hover:bg-accent-subtle"
                    >
                      <div className="font-medium">{lesson.title}</div>
                      {preview ? (
                        <div className="text-sm text-muted mt-0.5 line-clamp-2">
                          {preview}
                        </div>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* Uncategorised lessons */}
      {(() => {
        const uncategorised = lessonsByTopic.get(null) ?? [];
        if (uncategorised.length === 0) return null;
        return (
          <section className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">{t("uncategorised")}</h2>
            <ul className={listCard}>
              {uncategorised.map((lesson) => {
                const preview = extractPlainText(lesson.body);
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/parent/lessons/${lesson.id}`}
                      className="block p-4 transition-colors hover:bg-accent-subtle"
                    >
                      <div className="font-medium">{lesson.title}</div>
                      {preview ? (
                        <div className="text-sm text-muted mt-0.5 line-clamp-2">
                          {preview}
                        </div>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })()}

      {(lessons ?? []).length === 0 ? (
        <p className="text-sm text-muted">{t("noLessons")}</p>
      ) : null}
    </div>
  );
}
