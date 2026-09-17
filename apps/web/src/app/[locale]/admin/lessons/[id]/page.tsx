import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BookMarked } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";

import { deleteLessonResource, deleteLesson, uploadLessonResource, toggleLessonPublished, updateLesson, upsertLessonTranslation, deleteLessonTranslation } from "./actions";
import { LessonEditForm } from "@/components/LessonEditForm";
import { LessonAudioSection } from "@/components/LessonAudioSection";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listCard } from "@/components/ui/surfaces";

import { inputCls } from "@/components/FormField";
type LessonTranslation = {
  locale: string;
  title: string;
  body: unknown[] | null;
};

const BUCKET = "lesson-resources";
const SIGNED_URL_TTL = 3600; // 1 hour

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireAdmin();
  await requirePlugin(ctx.mosqueId, "lesson_library", "/admin");
  const supabase = await createClient();
  const admin = createAdminClient();
  const t = await getTranslations("Admin");

  // Load lesson (RLS verifies it belongs to admin's mosque)
  const [{ data: lesson }, { data: topics }, { data: translations }, { data: audio }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, body, topic_id, is_published, topics(title)")
      .eq("id", id)
      .eq("mosque_id", ctx.mosqueId)
      .maybeSingle(),
    supabase
      .from("topics")
      .select("id, title")
      .eq("mosque_id", ctx.mosqueId)
      .order("sort_order"),
    supabase
      .from("lesson_translations")
      .select("locale, title, body")
      .eq("lesson_id", id)
      .eq("mosque_id", ctx.mosqueId),
    supabase
      .from("lesson_audio")
      .select("id, locale, title, mime_type, size_bytes, storage_path")
      .eq("lesson_id", id)
      .eq("mosque_id", ctx.mosqueId)
      .order("sort_order")
      .order("created_at"),
  ]);

  if (!lesson) notFound();

  // Load attached resources
  const { data: resources } = await supabase
    .from("lesson_resources")
    .select("id, title, storage_path, mime_type, size_bytes, sort_order")
    .eq("lesson_id", id)
    .eq("mosque_id", ctx.mosqueId)
    .order("sort_order")
    .order("created_at");

  // Generate signed download URLs for each resource (service role)
  const resourcesWithUrls = await Promise.all(
    (resources ?? []).map(async (r) => {
      const { data } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(r.storage_path, SIGNED_URL_TTL);
      return { ...r, signedUrl: data?.signedUrl ?? null };
    }),
  );

  function formatBytes(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={<BookMarked className="h-5 w-5" />}
        title={lesson.title}
        breadcrumbs={[
          { href: "/admin", label: t("overview") },
          { href: "/admin/lessons", label: t("lessonLibrary") },
          { label: lesson.title },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <ActionForm action={toggleLessonPublished.bind(null, id, !!(lesson.is_published))} successMessage="">
              <button type="submit" className={`text-xs rounded-full px-2.5 py-1 font-medium border transition-colors ${
                lesson.is_published
                  ? "border-success/50 bg-success-subtle text-success-fg hover:bg-success-subtle"
                  : "border-card-border bg-card text-muted-foreground hover:bg-accent-subtle"
              }`}>
                {lesson.is_published ? t("published") : t("draft")}
              </button>
            </ActionForm>
            <form action={deleteLesson}>
              <input type="hidden" name="lesson_id" value={id} />
              <button className={buttonVariants({ variant: "destructive", size: "sm" })}>
                {t("deleteLesson")}
              </button>
            </form>
          </div>
        }
      />

      {/* Edit lesson */}
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
        })) as LessonTranslation[]}
        actions={{
          updateLesson,
          upsertTranslation: upsertLessonTranslation,
          deleteTranslation: deleteLessonTranslation,
        }}
      />

      {/* Resources */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{t("attachedFiles")}</h2>

        <ActionForm
          action={uploadLessonResource}
          successMessage={t("fileUploaded")}
          className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5"
        >
          <input type="hidden" name="lesson_id" value={id} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              name="title"
              required
              placeholder={t("fileName")}
              className={inputCls}
            />
            <input
              type="file"
              name="file"
              required
              className="rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-accent-subtle file:px-2 file:py-1 file:text-xs file:font-medium file:text-accent"
            />
          </div>
          <button className={cn(buttonVariants({ size: "xl" }), "self-start")}>
            {t("uploadFile")}
          </button>
        </ActionForm>

        <ul className={listCard}>
          {resourcesWithUrls.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-muted">
                  {r.mime_type ? `${r.mime_type} · ` : ""}
                  {formatBytes(r.size_bytes)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.signedUrl ? (
                  <a
                    href={r.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    {t("download")}
                  </a>
                ) : null}
                <ActionForm
                  action={deleteLessonResource}
                  successMessage={t("fileDeleted")}
                  resetOnSuccess={false}
                >
                  <input type="hidden" name="resource_id" value={r.id} />
                  <input type="hidden" name="storage_path" value={r.storage_path} />
                  <input type="hidden" name="lesson_id" value={id} />
                  <button className={buttonVariants({ variant: "destructive", size: "sm" })}>
                    {t("deleteFile")}
                  </button>
                </ActionForm>
              </div>
            </li>
          ))}
          {resourcesWithUrls.length === 0 ? (
            <li className="p-4 text-sm text-muted">{t("noFiles")}</li>
          ) : null}
        </ul>
      </section>

      {/* Lesson audio — one or more recordings per lesson, optionally per
          language; streamed on the mobile app. */}
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
    </div>
  );
}
