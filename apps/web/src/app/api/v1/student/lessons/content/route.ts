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
  locale: z.enum(routing.locales).optional(),
});

/**
 * The text of every published lesson in one request.
 *
 * The mobile app uses this to back-fill the per-lesson cache silently: when
 * the lesson list loads, the app fetches this once and stores each body under
 * the same key the detail screen reads, so opening a lesson is instant (or
 * works offline). Deliberately **no** signed URLs here — those expire, and the
 * detail endpoint (with `?locale=…`) is what a real visit refetches for the
 * fresh attachments and audio.
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

  const [{ data: lessons, error }, { data: translations, error: trErr }] =
    await Promise.all([
      supabase
        .from("lessons")
        .select("id, title, body, topic_id, updated_at, topics(id, title)")
        .eq("mosque_id", ctx.mosqueId)
        .eq("is_published", true),
      locale
        ? supabase
            .from("lesson_translations")
            .select("lesson_id, title, body")
            .eq("mosque_id", ctx.mosqueId)
            .eq("locale", locale)
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (error) return dbErr(error.message);
  if (trErr) return dbErr(trErr.message);

  const translationByLesson = new Map<string, { title: string; body: unknown }>();
  for (const tr of translations ?? []) {
    translationByLesson.set(tr.lesson_id, { title: tr.title, body: tr.body });
  }

  return ok(
    (lessons ?? []).map((l) => {
      const tr = translationByLesson.get(l.id);
      const topic = l.topics as { id: string; title: string } | null;
      return {
        id: l.id,
        title: tr?.title ?? l.title,
        body: tr?.body ?? l.body,
        updatedAt: l.updated_at,
        topic: topic ? { id: topic.id, title: topic.title } : null,
      };
    }),
  );
}
