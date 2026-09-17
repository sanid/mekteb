"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export async function createTopic(formData: FormData) {
  const ctx = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) return;

  const supabase = await createClient();
  const { data: maxTopic } = await supabase
    .from("topics")
    .select("sort_order")
    .eq("mosque_id", ctx.mosqueId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("topics").insert({
    mosque_id: ctx.mosqueId,
    title,
    description,
    sort_order: (maxTopic?.sort_order ?? -1) + 1,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  revalidatePath("/", "layout");
}

export async function deleteTopic(formData: FormData) {
  const ctx = await requireAdmin();
  const topicId = String(formData.get("topic_id") ?? "").trim();
  if (!topicId) return;

  const supabase = await createClient();
  await supabase
    .from("topics")
    .delete()
    .eq("id", topicId)
    .eq("mosque_id", ctx.mosqueId);
  revalidatePath("/", "layout");
}

export async function reorderTopics(itemIds: string[]) {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  for (let i = 0; i < itemIds.length; i++) {
    await supabase
      .from("topics")
      .update({ sort_order: i, updated_by: ctx.userId })
      .eq("id", itemIds[i])
      .eq("mosque_id", ctx.mosqueId);
  }
  revalidatePath("/", "layout");
}

export async function createLesson(formData: FormData) {
  const ctx = await requireAdmin();
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
  if (!title) return;

  const supabase = await createClient();

  let query = supabase
    .from("lessons")
    .select("sort_order")
    .eq("mosque_id", ctx.mosqueId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (topic_id) {
    query = query.eq("topic_id", topic_id);
  } else {
    query = query.is("topic_id", null);
  }

  const { data: maxLesson } = await query.maybeSingle();

  await supabase.from("lessons").insert({
    mosque_id: ctx.mosqueId,
    topic_id,
    title,
    body: body as Json,
    sort_order: (maxLesson?.sort_order ?? -1) + 1,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  revalidatePath("/", "layout");
}

export async function reorderLessons(itemIds: string[]) {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  for (let i = 0; i < itemIds.length; i++) {
    await supabase
      .from("lessons")
      .update({ sort_order: i, updated_by: ctx.userId })
      .eq("id", itemIds[i])
      .eq("mosque_id", ctx.mosqueId);
  }
  revalidatePath("/", "layout");
}

export async function resetCurriculumAction() {
  const ctx = await requireAdmin();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { TOPICS, BOSNIAN_LESSONS, GERMAN_LESSONS, germanBlocksToBlockNote } = await import("@/lib/curriculum-data");

  const admin = createAdminClient();

  // Delete all dependent rows
  await admin.from("lesson_resources").delete().eq("mosque_id", ctx.mosqueId);
  await admin.from("lesson_completions").delete().eq("mosque_id", ctx.mosqueId);
  await admin.from("lesson_audio").delete().eq("mosque_id", ctx.mosqueId);
  await admin.from("lesson_translations").delete().eq("mosque_id", ctx.mosqueId);
  await admin.from("exam_lesson_results").delete().eq("mosque_id", ctx.mosqueId);

  // Delete existing lessons and topics
  await admin.from("lessons").delete().eq("mosque_id", ctx.mosqueId);
  await admin.from("topics").delete().eq("mosque_id", ctx.mosqueId);

  // Seed topics
  const topicMap = new Map<string, string>();
  for (const t of TOPICS) {
    const { data: topicData } = await admin
      .from("topics")
      .insert({
        mosque_id: ctx.mosqueId,
        title: t.title,
        description: t.description,
        sort_order: t.sort_order,
        is_published: true,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      })
      .select("id")
      .single();

    if (topicData) {
      topicMap.set(t.key, topicData.id);
    }
  }

  // Seed lessons and German translations
  const germanMap = new Map(GERMAN_LESSONS.map((g) => [g.bosnianTitle, g]));

  for (const bLesson of BOSNIAN_LESSONS) {
    const topicId = topicMap.get(bLesson.topic_key);
    if (!topicId) continue;

    const { data: lessonData } = await admin
      .from("lessons")
      .insert({
        mosque_id: ctx.mosqueId,
        topic_id: topicId,
        title: bLesson.title,
        body: bLesson.blocks as Json,
        sort_order: bLesson.sort_order,
        is_published: true,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      })
      .select("id")
      .single();

    if (lessonData) {
      const gMatch = germanMap.get(bLesson.title);
      if (gMatch) {
        const gBlocks = germanBlocksToBlockNote(gMatch.blocks);
        await admin.from("lesson_translations").insert({
          mosque_id: ctx.mosqueId,
          lesson_id: lessonData.id,
          locale: "de",
          title: gMatch.germanTitle,
          body: gBlocks as Json,
          created_by: ctx.userId,
        });
      }
    }
  }

  revalidatePath("/", "layout");
}

