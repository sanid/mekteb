import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BookMarked } from "lucide-react";

import { requireParent } from "@/lib/auth";
import { requirePlugin } from "@/lib/plugins";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import type { Block } from "@blocknote/core";
import { DynamicBlockNoteRenderer } from "@/components/DynamicBlockNoteRenderer";
import { PageHeader } from "@/components/PageHeader";
import { listCard } from "@/components/ui/surfaces";

const BUCKET = "lesson-resources";
const SIGNED_URL_TTL = 3600; // 1 hour

export default async function ParentLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireParent();
  await requirePlugin(ctx.mosqueId, "lesson_library", "/parent");
  const supabase = await createClient();
  const admin = createAdminClient();
  const t = await getTranslations("Parent");
  const activeLocale = await getLocale();

  // Load lesson + translation for active locale (RLS limits to published lessons)
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

  // Prefer locale-matched translation if available
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

  // Load attached resources
  const { data: resources } = await supabase
    .from("lesson_resources")
    .select("id, title, storage_path, mime_type, size_bytes, sort_order")
    .eq("lesson_id", id)
    .eq("mosque_id", ctx.mosqueId)
    .order("sort_order")
    .order("created_at");

  // Generate signed download URLs (service-role client)
  const resourcesWithUrls = await Promise.all(
    (resources ?? []).map(async (r) => {
      const { data } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(r.storage_path, SIGNED_URL_TTL);
      return { ...r, signedUrl: data?.signedUrl ?? null };
    }),
  );

  const blocks: Block[] = Array.isArray(displayBody)
    ? (displayBody as unknown as Block[])
    : [];

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
        title={displayTitle}
        breadcrumbs={[
          { href: "/parent", label: t("overview") },
          { href: "/parent/lessons", label: t("lessonLibrary") },
          { label: displayTitle },
        ]}
      />

      {/* Lesson info */}
      <div className="rounded-xl border border-card-border bg-card p-5 space-y-3">
        {topicTitle ? (
          <span className="inline-block text-xs rounded-full bg-accent-subtle px-2.5 py-0.5 text-accent">
            {topicTitle}
          </span>
        ) : null}
        {blocks.length > 0 ? (
          <DynamicBlockNoteRenderer blocks={blocks} />
        ) : null}
      </div>

      {/* Resources */}
      {resourcesWithUrls.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">{t("attachedFiles")}</h2>
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
                {r.signedUrl ? (
                  <a
                    href={r.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-sm text-accent hover:underline"
                  >
                    {t("download")}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
