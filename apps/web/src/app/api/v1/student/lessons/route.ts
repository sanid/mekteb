import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiMember,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { requireApiPlugin } from "@/app/api/v1/helpers/plugins";
import { parseQuery } from "@/app/api/v1/helpers/validate";
import { routing } from "@/i18n/routing";

const querySchema = z.object({
  /** Falls back to the mosque default when omitted or untranslated. */
  locale: z.enum(routing.locales).optional(),
});

/**
 * The student lesson library: published topics with their published lessons.
 *
 * Titles honour `lesson_translations` for the requested locale, matching the
 * web portal — a client that ignored this would show German titles to a
 * Bosnian student.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const gate = await requireApiPlugin(request, ctx.mosqueId, "lesson_library");
  if (gate) return gate;

  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { locale } = parsed.data;

  const supabase = await createSupabaseForUser(request);

  const [{ data: topics, error: topicsErr }, { data: lessons, error: lessonsErr }] =
    await Promise.all([
      supabase
        .from("topics")
        .select("id, title, description, sort_order")
        .eq("mosque_id", ctx.mosqueId)
        .eq("is_published", true)
        .order("sort_order"),
      supabase
        .from("lessons")
        .select("id, title, topic_id, sort_order, updated_at")
        .eq("mosque_id", ctx.mosqueId)
        .eq("is_published", true)
        .order("sort_order"),
    ]);

  if (topicsErr) return dbErr(topicsErr.message);
  if (lessonsErr) return dbErr(lessonsErr.message);

  // Topic titles honour `topic_translations` for the locale, exactly like
  // lesson titles — a Bosnian student should see Bosnian topic headers.
  const topicTranslations = new Map<string, { title: string; description: string | null }>();
  if (locale && (topics ?? []).length > 0) {
    const { data: rows } = await supabase
      .from("topic_translations")
      .select("topic_id, title, description")
      .eq("mosque_id", ctx.mosqueId)
      .eq("locale", locale)
      .in("topic_id", (topics ?? []).map((t) => t.id));
    for (const r of rows ?? []) {
      if (r.title) {
        topicTranslations.set(r.topic_id, { title: r.title, description: r.description });
      }
    }
  }

  // Titles only — bodies are fetched per lesson, so the list stays small.
  const translations = new Map<string, string>();
  if (locale && (lessons ?? []).length > 0) {
    const { data: rows } = await supabase
      .from("lesson_translations")
      .select("lesson_id, title")
      .eq("mosque_id", ctx.mosqueId)
      .eq("locale", locale)
      .in("lesson_id", (lessons ?? []).map((l) => l.id));
    for (const r of rows ?? []) {
      if (r.title) translations.set(r.lesson_id, r.title);
    }
  }

  const byTopic = new Map<string | null, Array<Record<string, unknown>>>();
  for (const lesson of lessons ?? []) {
    const key = lesson.topic_id ?? null;
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key)!.push({
      id: lesson.id,
      title: translations.get(lesson.id) ?? lesson.title,
      sortOrder: lesson.sort_order,
      updatedAt: lesson.updated_at,
    });
  }

  const grouped = (topics ?? []).map((t) => {
    const tr = topicTranslations.get(t.id);
    return {
      id: t.id,
      title: tr?.title ?? t.title,
      description: tr ? (tr.description ?? t.description) : t.description,
      sortOrder: t.sort_order,
      lessons: byTopic.get(t.id) ?? [],
    };
  });

  // Lessons with no topic still need somewhere to live.
  const untopiced = byTopic.get(null) ?? [];
  if (untopiced.length > 0) {
    grouped.push({
      id: null as unknown as string,
      title: null as unknown as string,
      description: null,
      sortOrder: Number.MAX_SAFE_INTEGER,
      lessons: untopiced,
    });
  }

  return ok(grouped);
}
