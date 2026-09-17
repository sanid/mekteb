import { BookMarked, ChevronRight, Globe } from "lucide-react";

import { Link } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";

import { TopicListClient } from "./TopicListClient";

export default async function LessonsPage() {
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "lesson_library", "/admin");
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const [{ data: topics }, { data: lessons }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title, description, sort_order")
      .eq("mosque_id", ctx.mosqueId)
      .order("sort_order"),
    supabase
      .from("lessons")
      .select("id, topic_id")
      .eq("mosque_id", ctx.mosqueId),
  ]);

  const lessonCountByTopic = new Map<string, number>();
  let uncategorizedCount = 0;
  for (const l of lessons ?? []) {
    if (l.topic_id) {
      lessonCountByTopic.set(l.topic_id, (lessonCountByTopic.get(l.topic_id) ?? 0) + 1);
    } else {
      uncategorizedCount++;
    }
  }

  const topicList = topics ?? [];

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<BookMarked className="h-5 w-5" />}
        title={t("lessonLibrary")}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { label: t("lessonLibrary") },
        ]}
      />

      <Link
        href="/admin/lessons/public"
        className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-4 transition-colors hover:bg-accent-subtle"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
          <Globe className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{t("publicLibrary")}</span>
          <span className="block text-sm text-muted">{t("publicLibraryDescription")}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </Link>

      <TopicListClient 
        initialTopics={topicList} 
        lessonCountByTopicArray={Array.from(lessonCountByTopic.entries()).map(([id, count]) => ({ id, count }))} 
      />

      {uncategorizedCount > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{t("uncategorized")}</h2>
          <Link
            href="/admin/lessons/uncategorized"
            prefetch={true}
            className="block rounded-xl border border-card-border p-4 transition-colors hover:bg-accent-subtle"
          >
            <div className="font-medium">{t("uncategorized")}</div>
            <div className="text-sm text-muted">
              {uncategorizedCount} {uncategorizedCount === 1 ? t("lessonSingular") : t("lessons").toLowerCase()}
            </div>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
