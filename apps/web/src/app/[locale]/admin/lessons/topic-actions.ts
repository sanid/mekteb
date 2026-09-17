"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

/** The locales a topic can carry a translation for — matches the app's. */
const TOPIC_LOCALES = ["de", "en", "bs", "tr"] as const;

/**
 * Rename a topic, edit its description, and maintain per-locale
 * translations. The base row is the fallback for any locale without a
 * translation; a locale row left blank removes the override.
 *
 * Lives in its own file (rather than `lessons/actions.ts`) so the admin
 * topic editor does not depend on the lesson-curriculum reset machinery.
 */
export async function updateTopic(formData: FormData) {
  const ctx = await requireAdmin();
  const topicId = String(formData.get("topic_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!topicId || !title) return;
  const description = String(formData.get("description") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("topics")
    .update({ title, description, updated_by: ctx.userId })
    .eq("id", topicId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return;

  for (const locale of TOPIC_LOCALES) {
    const tTitle = String(formData.get(`translation_${locale}_title`) ?? "").trim();
    const tDescription = String(formData.get(`translation_${locale}_description`) ?? "").trim();

    if (tTitle) {
      await supabase.from("topic_translations").upsert(
        {
          mosque_id: ctx.mosqueId,
          topic_id: topicId,
          locale,
          title: tTitle,
          description: tDescription || null,
          created_by: ctx.userId,
          updated_by: ctx.userId,
        },
        { onConflict: "topic_id,locale" },
      );
    } else {
      // Empty translation row = remove the override (no-op if none exists).
      await supabase
        .from("topic_translations")
        .delete()
        .eq("topic_id", topicId)
        .eq("locale", locale)
        .eq("mosque_id", ctx.mosqueId);
    }
  }

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "topic.updated",
    targetTable: "topics",
    targetId: topicId,
    metadata: { title },
  });
  revalidatePath("/", "layout");
}
