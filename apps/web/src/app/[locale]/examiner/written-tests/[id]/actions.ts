"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireExaminer } from "@/lib/auth";
import { enqueueExamNotifications } from "@/lib/exam-notifications";

const GradeSchema = z.object({
  overall_result: z.enum(["passed", "failed"]),
  examiner_note: z.string().max(1000).optional(),
  answer_comments: z.array(z.object({
    answer_id: z.string().uuid(),
    comment: z.string().max(500),
  })),
});

export async function gradeWrittenTest(testId: string, raw: z.infer<typeof GradeSchema>) {
  const ctx = await requireExaminer();
  const parsed = GradeSchema.parse(raw);
  const supabase = await createClient();

  const { data: test } = await supabase
    .from("written_tests")
    .select("id, mosque_id, exam_session_id, student_profile_id, title, status, examiner_profile_id")
    .eq("id", testId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!test) throw new Error("Test nicht gefunden");
  if (test.status === "graded") throw new Error("Test bereits bewertet");
  // A test belongs to the examiner who set it — another examiner must not
  // re-grade it (mirrors the scoping of every other examiner action).
  if (test.examiner_profile_id && test.examiner_profile_id !== ctx.teacherProfileId) {
    throw new Error("Keine Berechtigung für diesen Test");
  }

  const admin = createAdminClient();

  // Save per-answer comments
  for (const { answer_id, comment } of parsed.answer_comments) {
    if (comment.trim()) {
      await admin
        .from("written_test_answers")
        .update({ examiner_comment: comment.trim() })
        .eq("id", answer_id)
        .eq("written_test_id", testId);
    }
  }

  // Mark test as graded
  await admin.from("written_tests").update({
    status: "graded",
    overall_result: parsed.overall_result,
    examiner_note: parsed.examiner_note?.trim() || null,
    graded_at: new Date().toISOString(),
    updated_by: ctx.userId,
  }).eq("id", testId);

  // Update exam_session.written_passed if linked
  if (test.exam_session_id) {
    await admin.from("exam_sessions").update({
      written_passed: parsed.overall_result === "passed",
      updated_by: ctx.userId,
    }).eq("id", test.exam_session_id).eq("mosque_id", ctx.mosqueId);
  }

  // Notify parents
  const { data: links } = await admin
    .from("parent_student_links")
    .select("parent_profiles(profile_id)")
    .eq("student_profile_id", test.student_profile_id)
    .eq("mosque_id", test.mosque_id);

  const parentIds = (links ?? [])
    .map((l) => (l.parent_profiles as { profile_id: string } | null)?.profile_id)
    .filter((id): id is string => !!id);

  if (parentIds.length > 0) {
    const resultLabel = parsed.overall_result === "passed" ? "Bestanden" : "Nicht bestanden";
    await enqueueExamNotifications({
      mosqueId: test.mosque_id,
      recipientProfileIds: parentIds,
      subject: `Testergebnis: ${test.title}`,
      body: `Der schriftliche Test "${test.title}" wurde bewertet: ${resultLabel}.\n\nDie Ergebnisse und Kommentare des Prüfers sind jetzt verfügbar.`,
    });
  }

  revalidatePath(`/[locale]/examiner/written-tests/${testId}`, "page");
  if (test.exam_session_id) revalidatePath(`/[locale]/examiner/exams/${test.exam_session_id}`, "page");
}
