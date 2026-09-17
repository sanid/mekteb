import { getTranslations } from "next-intl/server";
import { BookMarked } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireStudent } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { extractPlainText } from "@/lib/blocknote-utils";
import { PageHeader } from "@/components/PageHeader";
import { listCard } from "@/components/ui/surfaces";

export default async function StudentLessonsPage() {
  const ctx = await requireStudent();
  await requirePlugin(ctx.mosqueId, "lesson_library", "/student");
  const supabase = await createClient();
  const t = await getTranslations("Student");

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

  const lessonsByTopic = new Map<string | null, typeof lessons>([[null, []]]);
  for (const topic of topics ?? []) lessonsByTopic.set(topic.id, []);
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
          { href: "/student", label: t("overview") },
          { label: t("lessonLibrary") },
        ]}
      />

      {(topics ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noLessons")}</p>
      ) : (
        <div className="space-y-8">
          {(topics ?? []).map((topic) => {
            const topicLessons = lessonsByTopic.get(topic.id) ?? [];
            if (topicLessons.length === 0) return null;
            return (
              <section key={topic.id} className="space-y-3">
                <h2 className="text-base font-semibold">{topic.title}</h2>
                <ul className={listCard}>
                  {topicLessons.map((lesson) => {
                    const preview = extractPlainText(
                      Array.isArray(lesson.body) ? (lesson.body as Parameters<typeof extractPlainText>[0]) : []
                    ).slice(0, 100);
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={`/student/lessons/${lesson.id}`}
                          className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-accent-subtle transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{lesson.title}</p>
                            {preview && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{preview}</p>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
