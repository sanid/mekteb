"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";
import { LESSON_AUDIO_MIME_TYPES } from "@/lib/upload-allowlists";

const BUCKET = "lesson-audio";

/**
 * The caller must be an admin or a teacher of the lesson's mosque. Both the
 * admin and teacher portals render the audio section, so this is a shared
 * role check rather than requireAdmin/requireTeacher; the table + bucket RLS
 * enforce the same thing server-side.
 */
async function assertCanManageLesson(
  lessonId: string,
): Promise<{ mosqueId: string; userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("mosque_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return null;

  const { data: roles } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("mosque_id", lesson.mosque_id)
    .eq("is_active", true);
  const canManage = (roles ?? []).some(
    (r) => r.role === "mosque_admin" || r.role === "teacher",
  );
  return canManage ? { mosqueId: lesson.mosque_id, userId: user.id } : null;
}

/** Locale values allowed on an audio track; empty string means "all languages". */
const LOCALES = ["", "de", "en", "bs", "tr"];

export async function uploadLessonAudio(formData: FormData): Promise<ActionResult> {
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const locale = String(formData.get("locale") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!lessonId || !title || !file || file.size === 0) {
    return await actionError("audio_missing_parameters");
  }
  if (!LOCALES.includes(locale)) return await actionError("invalid_file_type");

  // App-level MIME allowlist — the bucket config is the backstop (same two
  // layers as every other upload path).
  if (!LESSON_AUDIO_MIME_TYPES.has(file.type)) {
    return await actionError("invalid_file_type");
  }

  const ctx = await assertCanManageLesson(lessonId);
  if (!ctx) return await actionError("not_authorised_for_group");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const storagePath = `${ctx.mosqueId}/lessons/${lessonId}/${Date.now()}_${safeName}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "audio/mpeg",
      upsert: false,
    });
  if (uploadError) {
    return await dbActionErr(uploadError.message, "uploadLessonAudio");
  }

  const supabase = await createClient();
  const { error: dbError } = await supabase.from("lesson_audio").insert({
    mosque_id: ctx.mosqueId,
    lesson_id: lessonId,
    locale: locale || null,
    title,
    storage_path: storagePath,
    mime_type: file.type || null,
    size_bytes: file.size,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (dbError) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return await dbActionErr(dbError.message, "uploadLessonAudio");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteLessonAudio(formData: FormData): Promise<ActionResult> {
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const audioId = String(formData.get("audio_id") ?? "").trim();
  const storagePath = String(formData.get("storage_path") ?? "").trim();
  if (!lessonId || !audioId || !storagePath) {
    return await actionError("audio_missing_parameters");
  }

  const ctx = await assertCanManageLesson(lessonId);
  if (!ctx) return await actionError("not_authorised_for_group");

  const supabase = await createClient();
  const { error } = await supabase
    .from("lesson_audio")
    .delete()
    .eq("id", audioId)
    .eq("lesson_id", lessonId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "deleteLessonAudio");

  // The row is gone; the object is orphaned. Best-effort cleanup — a missing
  // object must not fail the delete the user already saw succeed.
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([storagePath]);

  revalidatePath("/", "layout");
  return { ok: true };
}
