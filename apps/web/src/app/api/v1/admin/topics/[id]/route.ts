import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized, notFound } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { writeAuditLog } from "@/lib/audit";

const LOCALES = ["de", "en", "bs", "tr"] as const;

const translationSchema = z.object({
  title: z.string().trim().min(1, "A translation title is required"),
  description: z.string().trim().nullable().optional(),
});

const putSchema = z.object({
  /** Base title — the fallback for any locale without a translation. */
  title: z.string().trim().min(1, "A title is required").optional(),
  description: z.string().trim().nullable().optional(),
  /**
   * Per-locale overrides, keyed by locale. `null` (or an omitted value)
   * deletes the existing translation for that locale; an object upserts it.
   */
  translations: z.record(z.enum(LOCALES), translationSchema.nullable()).optional(),
});

/**
 * Rename a topic, edit its description, and maintain its per-locale
 * translations — the missing edit half of the topics API (which previously
 * only offered create and delete). Mirrors the web `updateTopic` server
 * action: base row always writable by admins, translations upserted per
 * locale with the same `(topic_id, locale)` conflict key.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await params;
  const parsed = await parseJson(request, putSchema);
  if (!parsed.ok) return parsed.response;
  const { title, description, translations } = parsed.data;

  const supabase = await createSupabaseForUser(request);

  const { data: topic, error: topicErr } = await supabase
    .from("topics")
    .select("id")
    .eq("id", id)
    .eq("mosque_id", admin.mosqueId)
    .maybeSingle();
  if (topicErr) return dbErr(topicErr.message);
  if (!topic) return notFound("Topic not found");

  // 1. Base row.
  if (title !== undefined) {
    const { error } = await supabase
      .from("topics")
      .update({
        title,
        ...(description !== undefined ? { description } : {}),
        updated_by: admin.userId,
      })
      .eq("id", id)
      .eq("mosque_id", admin.mosqueId);
    if (error) return dbErr(error.message);
  }

  // 2. Translations.
  if (translations) {
    for (const [locale, tr] of Object.entries(translations)) {
      if (tr === null) {
        const { error } = await supabase
          .from("topic_translations")
          .delete()
          .eq("topic_id", id)
          .eq("locale", locale)
          .eq("mosque_id", admin.mosqueId);
        if (error) return dbErr(error.message);
      } else {
        const { error } = await supabase
          .from("topic_translations")
          .upsert(
            {
              mosque_id: admin.mosqueId,
              topic_id: id,
              locale,
              title: tr.title,
              description: tr.description ?? null,
              created_by: admin.userId,
              updated_by: admin.userId,
            },
            { onConflict: "topic_id,locale" },
          );
        if (error) return dbErr(error.message);
      }
    }
  }

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "topic.updated",
    targetTable: "topics",
    targetId: id,
    metadata: title !== undefined ? { title } : {},
  });

  return ok({ updated: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireApiAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await params;
  const supabase = await createSupabaseForUser(request);

  const { error } = await supabase
    .from("topics")
    .delete()
    .eq("id", id)
    .eq("mosque_id", admin.mosqueId);

  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: admin.mosqueId,
    actorUserId: admin.userId,
    action: "topic.deleted",
    targetTable: "topics",
    targetId: id,
  });

  return ok(null);
}
