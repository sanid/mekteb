"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { QuestionRow, TopicRow } from "@/app/[locale]/examiner/tests/new/actions";

export async function fetchAdminQuestionsAndTopics(): Promise<{
  questions: QuestionRow[];
  topics: TopicRow[];
}> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const [{ data: questions }, { data: topics }] = await Promise.all([
    supabase
      .from("exam_questions")
      .select("id, question_text, difficulty, topic_id")
      .eq("mosque_id", ctx.mosqueId)
      .eq("is_active", true)
      .order("topic_id", { nullsFirst: false })
      .order("question_text"),
    supabase
      .from("topics")
      .select("id, title")
      .eq("mosque_id", ctx.mosqueId)
      .order("sort_order"),
  ]);

  return { questions: questions ?? [], topics: topics ?? [] };
}
