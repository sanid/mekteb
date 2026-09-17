"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueExamNotifications } from "@/lib/exam-notifications";

const SubmitSchema = z.object({
  token: z.string().min(1),
  answers: z.array(z.object({
    question_id: z.string().uuid(),
    question_order: z.number().int(),
    answer_text: z.string(),
  })).min(1),
});

export async function submitWrittenTest(raw: z.infer<typeof SubmitSchema>) {
  const parsed = SubmitSchema.parse(raw);
  const admin = createAdminClient();

  const { data: test } = await admin
    .from("written_tests")
    .select("id, mosque_id, status, title, question_ids, examiner_profile_id, teacher_profiles(profile_id)")
    .eq("token", parsed.token)
    .maybeSingle();

  if (!test) throw new Error("Test nicht gefunden");
  if (test.status !== "pending") throw new Error("Dieser Test wurde bereits eingereicht");

  // Only questions that are actually on this test are accepted — a crafted
  // submission must not attach answers from another mosque's question bank.
  const allowed = new Set<string>(test.question_ids as string[]);
  const answerRows = parsed.answers
    .filter((a) => allowed.has(a.question_id))
    .map((a) => ({
      mosque_id: test.mosque_id,
      written_test_id: test.id,
      question_id: a.question_id,
      question_order: a.question_order,
      answer_text: a.answer_text.trim(),
    }));

  if (answerRows.length === 0) {
    throw new Error("Keine der Antworten gehört zu diesem Test");
  }

  // Claim the test first (conditional flip closes the double-submit race:
  // only the first submission to land on a still-pending row wins), then
  // insert the answers; on failure release the claim so a retry can work.
  const { data: flipped, error: claimErr } = await admin
    .from("written_tests")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", test.id)
    .eq("status", "pending")
    .select("id");
  if (claimErr) throw new Error(claimErr.message);
  if (!flipped || flipped.length === 0) {
    throw new Error("Dieser Test wurde bereits eingereicht");
  }

  const { error: answerErr } = await admin
    .from("written_test_answers")
    .insert(answerRows);
  if (answerErr) {
    await admin
      .from("written_tests")
      .update({ status: "pending", submitted_at: null })
      .eq("id", test.id)
      .eq("status", "submitted");
    throw new Error(answerErr.message);
  }

  // Notify examiner
  const examinerProfileId = (test.teacher_profiles as { profile_id: string } | null)?.profile_id;
  if (examinerProfileId) {
    await enqueueExamNotifications({
      mosqueId: test.mosque_id,
      recipientProfileIds: [examinerProfileId],
      subject: `Test eingereicht: ${test.title}`,
      body: `Ein Schüler hat den schriftlichen Test "${test.title}" eingereicht. Sie können ihn jetzt bewerten.`,
    });
  }
}
