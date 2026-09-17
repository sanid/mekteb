import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BookMarked } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import type { Block } from "@blocknote/core";
import { DynamicBlockNoteRenderer } from "@/components/DynamicBlockNoteRenderer";
import { PageHeader } from "@/components/PageHeader";

const BUCKET = "lesson-resources";
const SIGNED_URL_TTL = 3600;

export default async function StudentLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireStudent();
  await requirePlugin(ctx.mosqueId, "lesson_library", "/student");
  const supabase = await createClient();
  const admin = createAdminClient();
  const t = await getTranslations("Student");
  const activeLocale = await getLocale();

  const [{ data: lesson }, { data: translation }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, body, mosque_id, topics(id, title)")
      .eq("id", id)
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_published", true)
      .maybeSingle(),
    supabase
      .from("lesson_translations")
      .select("title, body")
      .eq("lesson_id", id)
      .eq("mosque_id", ctx.mosqueId)
      .eq("locale", activeLocale)
      .maybeSingle(),
  ]);

  if (!lesson) notFound();

  const displayTitle = translation?.title ?? lesson.title;
  const displayBody = translation?.body ?? lesson.body;

  // Translated topic heading, like the lesson title itself.
  const topic = lesson.topics as { id: string; title: string } | null;
  const { data: topicTr } = topic
    ? await supabase
        .from("topic_translations")
        .select("title")
        .eq("topic_id", topic.id)
        .eq("locale", activeLocale)
        .maybeSingle()
    : { data: null };
  const topicTitle = topicTr?.title ?? topic?.title ?? null;

  const { data: resources } = await supabase
    .from("lesson_resources")
    .select("id, title, storage_path, mime_type, size_bytes, sort_order")
    .eq("lesson_id", id)
    .eq("mosque_id", ctx.mosqueId)
    .order("sort_order")
    .order("created_at");

  const resourcesWithUrls = await Promise.all(
    (resources ?? []).map(async (r) => {
      const { data } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(r.storage_path, SIGNED_URL_TTL);
      return { ...r, signedUrl: data?.signedUrl ?? null };
    }),
  );

  const blocks: Block[] = Array.isArray(displayBody) ? (displayBody as unknown as Block[]) : [];

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<BookMarked className="h-5 w-5" />}
        title={displayTitle}
        breadcrumbs={[
          { href: "/student", label: t("overview") },
          { href: "/student/lessons", label: t("lessonLibrary") },
          { label: displayTitle },
        ]}
      />

      {topicTitle && (
        <p className="text-sm text-muted-foreground -mt-4">{topicTitle}</p>
      )}

      {blocks.length > 0 ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <DynamicBlockNoteRenderer blocks={blocks} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noLessons")}</p>
      )}

      {resourcesWithUrls.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t("attachedFiles")}</h3>
          <ul className="space-y-2">
            {resourcesWithUrls.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-card-border bg-card px-4 py-2.5">
                <span className="text-sm truncate">{r.title}</span>
                {r.signedUrl && (
                  <a
                    href={r.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 shrink-0 text-xs text-accent hover:underline"
                  >
                    {t("download")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
