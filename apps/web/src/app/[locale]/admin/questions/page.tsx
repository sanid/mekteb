import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import QuestionBank from "./QuestionBank";
import { PageHeader } from "@/components/PageHeader";

export default async function QuestionsPage() {
  const t = await getTranslations("WrittenTests");
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const [{ data: questions }, { data: topics }] = await Promise.all([
    supabase
      .from("exam_questions")
      .select("id, question_text, difficulty, topic_id, is_active")
      .eq("mosque_id", ctx.mosqueId)
      .order("topic_id", { nullsFirst: false })
      .order("question_text"),
    supabase
      .from("topics")
      .select("id, title")
      .eq("mosque_id", ctx.mosqueId)
      .order("sort_order"),
  ]);

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title={t("questionBank")} description={t("questionBankSub")} />
      <QuestionBank questions={questions ?? []} topics={topics ?? []} />
    </div>
  );
}
