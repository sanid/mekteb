import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BookMarked } from "lucide-react";

import { requireTeacher } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Block } from "@blocknote/core";
import { DynamicBlockNoteRenderer } from "@/components/DynamicBlockNoteRenderer";
import { LessonEditForm } from "@/components/LessonEditForm";
import { LessonAudioSection } from "@/components/LessonAudioSection";
import { PageHeader } from "@/components/PageHeader";

import { updateLesson, upsertLessonTranslation, deleteLessonTranslation } from "./actions";

const BUCKET = "lesson-resources";
const SIGNED_URL_TTL = 3600;

export default async function TeacherLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTeacher();
  await requirePlugin(ctx.mosqueId, "lesson_library", "/teacher");
  const supabase = await createClient();
  const admin = createAdminClient();
  const t = await getTranslations("Teacher");
  const activeLocale = await getLocale();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, body, is_published, mosque_id, topic_id, topics(id, title)")
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!lesson) notFound();

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

  const blocks: Block[] = Array.isArray(lesson.body) ? (lesson.body as unknown as Block[]) : [];

  const { data: topics } = await supabase
    .from("topics")
    .select("id, title")
    .eq("mosque_id", ctx.mosqueId)
    .order("sort_order");

  const { data: translations } = await supabase
    .from("lesson_translations")
    .select("locale, title, body")
    .eq("lesson_id", id)
    .eq("mosque_id", ctx.mosqueId);

  const { data: audio } = await supabase
    .from("lesson_audio")
    .select("id, locale, title, mime_type, size_bytes, storage_path")
    .eq("lesson_id", id)
    .eq("mosque_id", ctx.mosqueId)
    .order("sort_order")
    .order("created_at");

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<BookMarked className="h-5 w-5" />}
        title={lesson.title}
        breadcrumbs={[
          { href: "/teacher", label: t("overview") },
          { href: "/teacher/lessons", label: t("lessonLibrary") },
          { label: lesson.title },
        ]}
      />

      {topicTitle && (
        <p className="text-sm text-muted-foreground -mt-4">{topicTitle}</p>
      )}

      {!lesson.is_published && (
        <div className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-muted-foreground">
          Diese Lektion ist noch nicht veröffentlicht und für Eltern nicht sichtbar.
        </div>
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

      {/* Lesson audio — same management surface as the admin portal. */}
      <LessonAudioSection
        lessonId={id}
        audio={(audio ?? []).map((a) => ({
          id: a.id,
          locale: a.locale,
          title: a.title,
          mimeType: a.mime_type,
          sizeBytes: a.size_bytes,
          storagePath: a.storage_path,
        }))}
      />

      {/* Edit lesson + translations — same tabbed editor as the admin portal,
          driven by teacher-scoped server actions (see 20260809160000 for the
          RLS branch that makes the translation writes possible). */}
      <LessonEditForm
        lessonId={id}
        mosqueId={ctx.mosqueId}
        title={lesson.title}
        body={Array.isArray(lesson.body) ? lesson.body : null}
        topicId={lesson.topic_id}
        topics={topics ?? []}
        translations={(translations ?? []).map((tr) => ({
          locale: tr.locale,
          title: tr.title,
          body: Array.isArray(tr.body) ? tr.body : null,
        }))}
        actions={{
          updateLesson,
          upsertTranslation: upsertLessonTranslation,
          deleteTranslation: deleteLessonTranslation,
        }}
      />
    </div>
  );
}
