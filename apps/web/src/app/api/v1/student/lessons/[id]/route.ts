import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiMember,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, notFound, unauthorized } from "@/app/api/v1/helpers/response";
import { requireApiPlugin } from "@/app/api/v1/helpers/plugins";
import { parseQuery } from "@/app/api/v1/helpers/validate";
import { routing } from "@/i18n/routing";

const BUCKET = "lesson-resources";
/** Signed URLs are short-lived; clients must refetch rather than cache them. */
const SIGNED_URL_TTL = 3600;
const AUDIO_BUCKET = "lesson-audio";

const querySchema = z.object({
  locale: z.enum(routing.locales).optional(),
});

/**
 * One published lesson, with its localised body and downloadable resources.
 *
 * `body` is BlockNote JSON. Only four block types occur in practice
 * (paragraph, heading, bulletListItem, numberedListItem) with plain-text
 * content, so clients can render it natively rather than in a web view.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const gate = await requireApiPlugin(request, ctx.mosqueId, "lesson_library");
  if (gate) return gate;

  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { locale } = parsed.data;

  const supabase = await createSupabaseForUser(request);

  const [{ data: lesson, error }, { data: translation }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, body, updated_at, topics(id, title)")
      .eq("id", id)
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_published", true)
      .maybeSingle(),
    locale
      ? supabase
          .from("lesson_translations")
          .select("title, body")
          .eq("lesson_id", id)
          .eq("mosque_id", ctx.mosqueId)
          .eq("locale", locale)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (error) return dbErr(error.message);
  if (!lesson) return notFound("Lesson not found.");

  const { data: resources, error: resErr } = await supabase
    .from("lesson_resources")
    .select("id, title, storage_path, mime_type, size_bytes, sort_order")
    .eq("lesson_id", id)
    .eq("mosque_id", ctx.mosqueId)
    .order("sort_order")
    .order("created_at");

  if (resErr) return dbErr(resErr.message);

  const { data: audio, error: audioErr } = await supabase
    .from("lesson_audio")
    .select("id, locale, title, storage_path, mime_type, size_bytes, duration_seconds, sort_order")
    .eq("lesson_id", id)
    .eq("mosque_id", ctx.mosqueId)
    .order("sort_order")
    .order("created_at");

  if (audioErr) return dbErr(audioErr.message);

  // Signing needs the service role; RLS has already authorised the read above.
  const admin = createSupabaseAdmin();
  const withUrls = await Promise.all(
    (resources ?? []).map(async (r) => {
      const { data } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(r.storage_path, SIGNED_URL_TTL);
      return {
        id: r.id,
        title: r.title,
        mimeType: r.mime_type,
        sizeBytes: r.size_bytes,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  const audioWithUrls = await Promise.all(
    (audio ?? []).map(async (a) => {
      const { data } = await admin.storage
        .from(AUDIO_BUCKET)
        .createSignedUrl(a.storage_path, SIGNED_URL_TTL);
      return {
        id: a.id,
        locale: a.locale,
        title: a.title,
        mimeType: a.mime_type,
        sizeBytes: a.size_bytes,
        durationSeconds: a.duration_seconds,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  const topic = lesson.topics as { id: string; title: string } | null;

  return ok({
    id: lesson.id,
    title: translation?.title ?? lesson.title,
    body: translation?.body ?? lesson.body,
    updatedAt: lesson.updated_at,
    topic: topic ? { id: topic.id, title: topic.title } : null,
    resources: withUrls,
    audio: audioWithUrls,
    signedUrlTtlSeconds: SIGNED_URL_TTL,
  });
}
