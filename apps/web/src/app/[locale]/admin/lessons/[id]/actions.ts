"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { dbActionErr, type ActionResult } from "@/lib/action-result";
import { actionError } from "@/lib/action-errors";
import { LESSON_RESOURCE_MIME_TYPES } from "@/lib/upload-allowlists";


export async function updateLesson(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
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

export async function toggleLessonPublished(lessonId: string, currentValue: boolean): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .update({ is_published: !currentValue, updated_by: ctx.userId })
    .eq("id", lessonId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "toggleLessonPublished");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleTopicPublished(topicId: string, currentValue: boolean): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("topics")
    .update({ is_published: !currentValue, updated_by: ctx.userId })
    .eq("id", topicId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return await dbActionErr(error.message, "toggleTopicPublished");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteLesson(formData: FormData) {
  const ctx = await requireAdmin();
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const locale = await getLocale();

  if (lessonId) {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: resources } = await supabase
      .from("lesson_resources")
      .select("storage_path")
      .eq("lesson_id", lessonId)
      .eq("mosque_id", ctx.mosqueId);

    if (resources && resources.length > 0) {
      await admin.storage
        .from("lesson-resources")
        .remove(resources.map((r) => r.storage_path));
    }

    await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId)
      .eq("mosque_id", ctx.mosqueId);
  }

  redirect(`/${locale}/admin/lessons`);
}

export async function upsertLessonTranslation(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
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
  const ctx = await requireAdmin();
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

// Storage bucket for lesson resources
const BUCKET = "lesson-resources";

export async function uploadLessonResource(formData: FormData) {
  const ctx = await requireAdmin();
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!lessonId || !title || !file || file.size === 0) return;

  // App-level MIME allowlist — the bucket config is the backstop, but a
  // spoofed or missing Content-Type must not admit active content (HTML, SVG,
  // scripts) that students would download and open.
  if (!LESSON_RESOURCE_MIME_TYPES.has(file.type)) {
    return await actionError("invalid_file_type");
  }

  // Verify the lesson belongs to the admin's mosque
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!lesson) return;

  // Sanitize filename and build storage path
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
  const storagePath = `${ctx.mosqueId}/lessons/${lessonId}/${Date.now()}_${safeName}`;

  // Upload to Storage using service-role client (bypasses storage RLS)
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) {
    return await dbActionErr(uploadError.message, "uploadLessonResource");
  }

  // Save metadata to lesson_resources (using user client so RLS is enforced)
  const { error: dbError } = await supabase.from("lesson_resources").insert({
    mosque_id: ctx.mosqueId,
    lesson_id: lessonId,
    title,
    storage_path: storagePath,
    mime_type: file.type || null,
    size_bytes: file.size,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });

  if (dbError) {
    // Roll back the storage upload if DB insert fails
    await admin.storage.from(BUCKET).remove([storagePath]);
    return await dbActionErr(dbError.message, "uploadLessonResource");
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteLessonResource(formData: FormData) {
  const ctx = await requireAdmin();
  const resourceId = String(formData.get("resource_id") ?? "").trim();
  const storagePath = String(formData.get("storage_path") ?? "").trim();
  const lessonId = String(formData.get("lesson_id") ?? "").trim();

  if (!resourceId || !storagePath || !lessonId) return;

  // Delete from DB first (RLS verifies ownership via mosque_id)
  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("lesson_resources")
    .delete()
    .eq("id", resourceId)
    .eq("mosque_id", ctx.mosqueId);
  if (dbError) {
    return await dbActionErr(dbError.message, "deleteLessonResource");
  }

  // Delete from Storage using service-role client
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([storagePath]);

  revalidatePath("/", "layout");
  return { ok: true as const };
}
