import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Data for the public, login-free lesson library at /library/{slug}.
 *
 * Uses the service-role client because visitors are anonymous. Every query is
 * therefore pinned to the mosque explicitly and filtered to published rows,
 * and nothing is returned unless the mosque switched the library on.
 */

import type { LibraryFont, LibraryTheme } from "@/lib/public-library-config";

export type PublicLibraryLesson = { id: string; title: string };
export type PublicLibraryTopic = {
  id: string | null; // null = lessons without a topic
  title: string;
  description: string | null;
  lessons: PublicLibraryLesson[];
};

export type PublicLibrary = {
  mosque: { id: string; name: string; slug: string };
  title: string;
  intro: string | null;
  accentColor: string | null;
  font: LibraryFont;
  theme: LibraryTheme;
  logoUrl: string | null;
  topics: PublicLibraryTopic[];
  /** Language of the untranslated lesson texts. */
  baseLocale: string;
  /** Languages the library can be read in: baseLocale + translated ones. */
  locales: string[];
};

const AUDIO_BUCKET = "lesson-audio";
const RESOURCE_BUCKET = "lesson-resources";
const SIGNED_URL_TTL = 60 * 60 * 6;

export const getPublicLibrary = cache(
  async (slug: string, locale: string): Promise<PublicLibrary | null> => {
    const admin = createAdminClient();
    const { data: mosque } = await admin
      .from("mosques")
      .select("id, name, slug, locale")
      .eq("slug", slug)
      .maybeSingle();
    if (!mosque) return null;

    const [{ data: settings }, { data: branding }, { data: plugin }] = await Promise.all([
      admin
        .from("public_library_settings")
        .select("*")
        .eq("mosque_id", mosque.id)
        .maybeSingle(),
      admin
        .from("mosque_branding")
        .select("primary_color, logo_url")
        .eq("mosque_id", mosque.id)
        .maybeSingle(),
      admin
        .from("mosque_plugins")
        .select("is_active")
        .eq("mosque_id", mosque.id)
        .eq("plugin_id", "lesson_library")
        .maybeSingle(),
    ]);
    if (!settings?.is_enabled || !plugin?.is_active) return null;

    const [{ data: topics }, { data: lessons }] = await Promise.all([
      admin
        .from("topics")
        .select("id, title, description, sort_order")
        .eq("mosque_id", mosque.id)
        .eq("is_published", true)
        .order("sort_order"),
      admin
        .from("lessons")
        .select("id, title, topic_id, sort_order")
        .eq("mosque_id", mosque.id)
        .eq("is_published", true)
        .order("sort_order"),
    ]);

    const topicIds = (topics ?? []).map((t) => t.id);
    const lessonIds = (lessons ?? []).map((l) => l.id);
    const [{ data: topicTr }, { data: lessonTr }] = await Promise.all([
      topicIds.length
        ? admin
            .from("topic_translations")
            .select("topic_id, title, description")
            .eq("locale", locale)
            .in("topic_id", topicIds)
        : Promise.resolve({ data: [] as { topic_id: string; title: string; description: string | null }[] }),
      lessonIds.length
        ? admin
            .from("lesson_translations")
            .select("lesson_id, title")
            .eq("locale", locale)
            .in("lesson_id", lessonIds)
        : Promise.resolve({ data: [] as { lesson_id: string; title: string }[] }),
    ]);
    // Which languages have any translation for the visible content.
    const { data: trLocales } = lessonIds.length
      ? await admin
          .from("lesson_translations")
          .select("locale")
          .in("lesson_id", lessonIds)
      : { data: [] as { locale: string }[] };
    const baseLocale = settings.base_locale ?? mosque.locale ?? "de";
    const available = new Set([baseLocale, ...(trLocales ?? []).map((r) => r.locale)]);
    const locales = ["de", "en", "bs", "tr"].filter((l) => available.has(l));

    const topicTrById = new Map((topicTr ?? []).map((r) => [r.topic_id, r]));
    const lessonTitleById = new Map((lessonTr ?? []).map((r) => [r.lesson_id, r.title]));

    const byTopic = new Map<string | null, PublicLibraryLesson[]>();
    for (const l of lessons ?? []) {
      const key = l.topic_id;
      const list = byTopic.get(key) ?? [];
      list.push({ id: l.id, title: lessonTitleById.get(l.id) ?? l.title });
      byTopic.set(key, list);
    }

    const result: PublicLibraryTopic[] = [];
    for (const t of topics ?? []) {
      const tr = topicTrById.get(t.id);
      const list = byTopic.get(t.id);
      if (!list?.length) continue;
      result.push({
        id: t.id,
        title: tr?.title ?? t.title,
        description: tr?.description ?? t.description ?? null,
        lessons: list,
      });
    }
    // Lessons with no topic (or whose topic is unpublished stay hidden).
    const loose = byTopic.get(null);
    if (loose?.length) {
      result.push({ id: null, title: "", description: null, lessons: loose });
    }

    return {
      mosque: { id: mosque.id, name: mosque.name, slug: mosque.slug },
      baseLocale,
      locales,
      title: settings.title?.trim() || mosque.name,
      intro: settings.intro?.trim() || null,
      accentColor: settings.accent_color ?? branding?.primary_color ?? null,
      font: (settings.font_style as LibraryFont) ?? "sans",
      theme: (settings.theme as LibraryTheme) ?? "system",
      logoUrl: settings.show_logo ? branding?.logo_url ?? null : null,
      topics: result,
    };
  },
);

export async function getPublicLesson(library: PublicLibrary, lessonId: string, locale: string) {
  // Only lessons listed in the library (published, in a published topic or
  // loose) are reachable.
  const visible = library.topics.some((t) => t.lessons.some((l) => l.id === lessonId));
  if (!visible) return null;

  const admin = createAdminClient();
  const mosqueId = library.mosque.id;
  const [{ data: lesson }, { data: tr }, { data: audio }, { data: resources }] = await Promise.all([
    admin
      .from("lessons")
      .select("id, title, body")
      .eq("id", lessonId)
      .eq("mosque_id", mosqueId)
      .maybeSingle(),
    admin
      .from("lesson_translations")
      .select("title, body")
      .eq("lesson_id", lessonId)
      .eq("locale", locale)
      .maybeSingle(),
    admin
      .from("lesson_audio")
      .select("id, title, locale, storage_path, mime_type")
      .eq("lesson_id", lessonId)
      .eq("mosque_id", mosqueId)
      .order("sort_order")
      .order("created_at"),
    admin
      .from("lesson_resources")
      .select("id, title, storage_path, mime_type, size_bytes")
      .eq("lesson_id", lessonId)
      .eq("mosque_id", mosqueId)
      .order("sort_order")
      .order("created_at"),
  ]);
  if (!lesson) return null;

  // Tracks for this language first, then the language-neutral ones.
  const tracks = (audio ?? []).filter((a) => a.locale === locale || a.locale === null);
  tracks.sort((a, b) => Number(a.locale === null) - Number(b.locale === null));

  const sign = async (bucket: string, path: string) =>
    (await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL)).data?.signedUrl ?? null;

  const [audioWithUrls, resourcesWithUrls] = await Promise.all([
    Promise.all(tracks.map(async (a) => ({ id: a.id, title: a.title, mimeType: a.mime_type, url: await sign(AUDIO_BUCKET, a.storage_path) }))),
    Promise.all((resources ?? []).map(async (r) => ({ id: r.id, title: r.title, mimeType: r.mime_type, sizeBytes: r.size_bytes, url: await sign(RESOURCE_BUCKET, r.storage_path) }))),
  ]);

  const body = tr?.body ?? lesson.body;
  return {
    id: lesson.id,
    title: tr?.title ?? lesson.title,
    body: Array.isArray(body) ? body : [],
    audio: audioWithUrls.filter((a) => a.url),
    resources: resourcesWithUrls.filter((r) => r.url),
  };
}

/**
 * Link prefix for library pages: "" on a library subdomain (the proxy
 * rewrites there), otherwise /library/{slug}.
 */
export async function getLibraryBase(slug: string): Promise<string> {
  const { headers } = await import("next/headers");
  return (await headers()).get("x-library-host") ? "" : `/library/${slug}`;
}
