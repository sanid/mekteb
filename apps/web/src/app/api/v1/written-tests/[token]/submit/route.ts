import { NextRequest } from "next/server";

import {
  requireApiMember,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import {
  ok,
  err,
  dbErr,
  unauthorized,
  notFound,
  forbidden,
} from "@/app/api/v1/helpers/response";

/**
 * Submit the answers for a written test, identified by its token.
 *
 * Same authorization as the GET: the test's own student (or the examiner /
 * a mosque admin). Answers may only be filed once — a second submit is
 * rejected before anything is written, exactly like the web action.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const answers = Array.isArray(body.answers) ? body.answers : [];
  if (answers.length === 0) return err("At least one answer is required");
  if (
    answers.some(
      (a: unknown) =>
        !a ||
        typeof a !== "object" ||
        typeof (a as { question_id?: unknown }).question_id !== "string" ||
        typeof (a as { answer_text?: unknown }).answer_text !== "string",
    )
  ) {
    return err("answers must be [{ question_id, question_order, answer_text }]");
  }

  const admin = createSupabaseAdmin();

  const { data: test } = await admin
    .from("written_tests")
    .select(
      "id, mosque_id, status, title, question_ids, student_profile_id, student_profiles(profile_id), teacher_profiles(profile_id)",
    )
    .eq("token", token.trim())
    .maybeSingle();

  if (!test) return notFound("Test not found");
  if (test.status !== "pending")
    return err("This test has already been submitted", 409);

  const studentUserId = (
    test.student_profiles as { profile_id: string | null } | null
  )?.profile_id;
  const examinerUserId = (
    test.teacher_profiles as { profile_id: string | null } | null
  )?.profile_id;

  const { data: adminRow } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("mosque_id", test.mosque_id)
    .eq("role", "mosque_admin")
    .eq("is_active", true)
    .maybeSingle();

  if (
    ctx.userId !== studentUserId &&
    ctx.userId !== examinerUserId &&
    !adminRow
  ) {
    return forbidden("This test does not belong to you");
  }

  // Only questions that are actually on this test are accepted.
  const allowed = new Set<string>(test.question_ids as string[]);
  const answerRows = (
    answers as {
      question_id: string;
      question_order?: unknown;
      answer_text: string;
    }[]
  )
    .map((a) => ({
      mosque_id: test.mosque_id,
      written_test_id: test.id,
      question_id: a.question_id,
      question_order:
        typeof a.question_order === "number" ? a.question_order : allowed.size,
      answer_text: a.answer_text.trim(),
    }))
    .filter((a) => allowed.has(a.question_id));

  if (answerRows.length === 0)
    return err("None of the submitted answers belong to this test", 400);

  // Claim the test first (conditional flip closes the double-submit race:
  // only the first submission to land on a still-pending row wins), then
  // insert the answers; on failure release the claim so a retry can work.
  const { data: flipped, error: claimErr } = await admin
    .from("written_tests")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", test.id)
    .eq("status", "pending")
    .select("id");
  if (claimErr) return dbErr(claimErr.message);
  if (!flipped || flipped.length === 0)
    return err("This test has already been submitted", 409);

  const { error: answerErr } = await admin
    .from("written_test_answers")
    .insert(answerRows);
  if (answerErr) {
    await admin
      .from("written_tests")
      .update({ status: "pending", submitted_at: null })
      .eq("id", test.id)
      .eq("status", "submitted");
    return dbErr(answerErr.message);
  }

  // The examiner who set it is told it is ready to grade.
  const examinerProfileId = (
    test.teacher_profiles as { profile_id: string | null } | null
  )?.profile_id;
  if (examinerProfileId) {
    const { enqueueExamNotifications } = await import("@/lib/exam-notifications");
    await enqueueExamNotifications({
      mosqueId: test.mosque_id,
      recipientProfileIds: [examinerProfileId],
      subject: `Test eingereicht: ${test.title}`,
      body: `Ein Schüler hat den schriftlichen Test "${test.title}" eingereicht. Sie können ihn jetzt bewerten.`,
    });
  }

  return ok({ submitted: true });
}
