"use server";

import { createClient } from "@/lib/supabase/server";
import { requireExaminer } from "@/lib/auth";

export type QuestionRow = {
  id: string;
  question_text: string;
  difficulty: string;
  topic_id: string | null;
};

export type TopicRow = {
  id: string;
  title: string;
};

export async function fetchQuestionsAndTopics(): Promise<{
  questions: QuestionRow[];
  topics: TopicRow[];
}> {
  const ctx = await requireExaminer();
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
