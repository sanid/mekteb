import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiExaminer,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { okNoStore, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { parseQuery } from "@/app/api/v1/helpers/validate";
import { routing } from "@/i18n/routing";

const querySchema = z.object({
  /** Resolves topic titles through `topic_translations` for this locale. */
  locale: z.enum(routing.locales).optional(),
});

/**
 * The question bank for building a written test — the mobile counterpart of
 * the web `fetchQuestionsAndTopics` used by the test builder. Examiners (and
 * admins, who share the examiner capability through the same profile) read
 * the mosque's active questions, grouped by topic for filtering; topic
 * titles honour `topic_translations` for the requested locale.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiExaminer(request);
  if (!ctx) return unauthorized();

  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { locale } = parsed.data;

  const supabase = await createSupabaseForUser(request);
  const [questionsRes, topicsRes] = await Promise.all([
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

  if (questionsRes.error) return dbErr(questionsRes.error.message);
  if (topicsRes.error) return dbErr(topicsRes.error.message);

  const topics = topicsRes.data ?? [];
  let topicsOut = topics.map((t) => ({ id: t.id, title: t.title }));

  if (locale && topics.length > 0) {
    const { data: rows } = await supabase
      .from("topic_translations")
      .select("topic_id, title")
      .eq("mosque_id", ctx.mosqueId)
      .eq("locale", locale)
      .in("topic_id", topics.map((t) => t.id));
    const byTopic = new Map((rows ?? []).map((r) => [r.topic_id, r.title]));
    topicsOut = topics.map((t) => ({
      id: t.id,
      title: byTopic.get(t.id) ?? t.title,
    }));
  }

  return okNoStore({
    questions: questionsRes.data ?? [],
    topics: topicsOut,
  });
}
