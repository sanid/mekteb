"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const QuestionSchema = z.object({
  question_text: z.string().min(5).max(1000),
  topic_id: z.string().uuid().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export async function createQuestion(formData: FormData) {
  const ctx = await requireAdmin();
  const parsed = QuestionSchema.parse({
    question_text: formData.get("question_text"),
    topic_id: formData.get("topic_id") || null,
    difficulty: formData.get("difficulty"),
  });

  const supabase = await createClient();
  const { error } = await supabase.from("exam_questions").insert({
    ...parsed,
    mosque_id: ctx.mosqueId,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/admin/questions", "page");
}

export async function updateQuestion(id: string, formData: FormData) {
  const ctx = await requireAdmin();
  const parsed = QuestionSchema.parse({
    question_text: formData.get("question_text"),
    topic_id: formData.get("topic_id") || null,
    difficulty: formData.get("difficulty"),
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_questions")
    .update({ ...parsed, updated_by: ctx.userId })
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/admin/questions", "page");
}

export async function toggleQuestionActive(id: string, currentlyActive: boolean) {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_questions")
    .update({ is_active: !currentlyActive, updated_by: ctx.userId })
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/admin/questions", "page");
}

export async function deleteQuestion(id: string) {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_questions")
    .delete()
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/admin/questions", "page");
}
