"use server";

import { revalidatePath } from "next/cache";

import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";

/**
 * Teacher-scoped lesson editor actions.
 *
 * `lessons_write` and the new `teacher write translations` policy both allow
 * teachers in the mosque to edit lessons and their translations; the shared
 * `LessonEditForm` needs the same three actions the admin page uses, but
 * gated on `requireTeacher` instead of `requireAdmin`. RLS still pins every
 * write to the caller's mosque.
 */

export async function updateLesson(formData: FormData): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const rawBody = String(formData.get("body") ?? "").trim();
  let body: unknown = null;
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody);
      if (Array.isArray(parsed) && parsed.length > 0) {
        body = parsed;
      }
    } catch {
      body = null;
    }
  }
  const topic_id = String(formData.get("topic_id") ?? "").trim() || null;

  if (!lessonId || !title) return await actionError("title_required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .update({ title, body: body as Json, topic_id, updated_by: ctx.userId, updated_at: new Date().toISOString() })
    .eq("id", lessonId)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return await dbActionErr(error.message, "updateLesson");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function upsertLessonTranslation(formData: FormData): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const locale = String(formData.get("locale") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const rawBody = String(formData.get("body") ?? "").trim();
  let body: unknown = null;
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody);
      if (Array.isArray(parsed) && parsed.length > 0) body = parsed;
    } catch {
      body = null;
    }
  }

  if (!lessonId || !locale || !title) return await actionError("locale_and_title_required");

  const supabase = await createClient();
  const { error } = await supabase.from("lesson_translations").upsert(
    {
      mosque_id: ctx.mosqueId,
      lesson_id: lessonId,
      locale,
      title,
      body: body as Json,
      updated_by: ctx.userId,
      created_by: ctx.userId,
    },
    { onConflict: "lesson_id,locale" },
  );
  if (error) return await dbActionErr(error.message, "upsertLessonTranslation");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteLessonTranslation(formData: FormData): Promise<ActionResult> {
  const ctx = await requireTeacher();
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const locale = String(formData.get("locale") ?? "").trim();
  if (!lessonId || !locale) return await actionError("missing_parameters");
  const supabase = await createClient();
  const { error } = await supabase
    .from("lesson_translations")
    .delete()
    .eq("lesson_id", lessonId)
    .eq("locale", locale)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "deleteLessonTranslation");
  revalidatePath("/", "layout");
  return { ok: true };
}
