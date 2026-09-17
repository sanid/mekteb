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
 * One written test by its token, as the student sees it: the questions while
 * it is pending, a confirmation once submitted, the graded result after.
 *
 * The web page at `/test/[token]` is public (the token is the capability, it
 * travels on the printed PDF). The mobile app can do better: everyone is
 * signed in, so the caller must be the test's own student, the examiner who
 * set it, or a mosque admin — a leaked token no longer grants anything.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const admin = createSupabaseAdmin();

  const { data: test } = await admin
    .from("written_tests")
    .select(
      "id, title, status, question_ids, mosque_id, overall_result, examiner_note, student_profile_id, student_profiles(profile_id, full_name), mosques(name), teacher_profiles(profile_id)",
    )
    .eq("token", token.trim())
    .maybeSingle();

  if (!test) return notFound("Test not found");

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

  // A parent of the test's student may read it too — the children screen
  // hands the graded result to them. They still cannot submit answers: the
  // submit route does its own, stricter check.
  let isParent = false;
  if (!adminRow && ctx.userId !== studentUserId && ctx.userId !== examinerUserId) {
    const { data: parentProfiles } = await admin
      .from("parent_profiles")
      .select("id")
      .eq("profile_id", ctx.userId)
      .eq("mosque_id", test.mosque_id)
      .limit(1);
    if (parentProfiles?.length) {
      const { data: link } = await admin
        .from("parent_student_links")
        .select("id")
        .eq("parent_profile_id", parentProfiles[0].id)
        .eq("student_profile_id", test.student_profile_id)
        .maybeSingle();
      isParent = !!link;
    }
  }

  if (
    ctx.userId !== studentUserId &&
    ctx.userId !== examinerUserId &&
    !adminRow &&
    !isParent
  ) {
    return forbidden("This test does not belong to you");
  }

  const mosqueName =
    (test.mosques as { name: string } | null)?.name ?? "";
  const studentName =
    (test.student_profiles as { full_name: string | null } | null)?.full_name ?? "";

  // Submitted: the questions are behind us, nothing to show but the state.
  if (test.status === "submitted") {
    return ok({ status: "submitted", title: test.title, mosqueName, studentName });
  }

  // Graded: the result with per-question examiner comments.
  if (test.status === "graded") {
    const { data: answers } = await admin
      .from("written_test_answers")
      .select("question_order, answer_text, examiner_comment, exam_questions(question_text)")
      .eq("written_test_id", test.id)
      .order("question_order");

    return ok({
      status: "graded",
      title: test.title,
      mosqueName,
      studentName,
      overallResult: test.overall_result,
      examinerNote: test.examiner_note,
      answers: (answers ?? []).map((a) => ({
        order: a.question_order,
        questionText:
          (a.exam_questions as { question_text: string } | null)?.question_text ?? "—",
        answerText: a.answer_text,
        examinerComment: a.examiner_comment,
      })),
    });
  }

  // Pending: the questions, in the order the examiner picked them.
  const questionIds = (test.question_ids ?? []) as string[];
  const { data: questionsRaw } = await admin
    .from("exam_questions")
    .select("id, question_text")
    .in("id", questionIds);

  const questions = questionIds
    .map((id, i) => {
      const q = (questionsRaw ?? []).find((r) => r.id === id);
      return q ? { id: q.id, question_text: q.question_text, order: i + 1 } : null;
    })
    .filter((q): q is { id: string; question_text: string; order: number } => q !== null);

  if (questions.length === 0)
    return err("This test has no questions", 409);

  return ok({
    status: "pending",
    title: test.title,
    mosqueName,
    studentName,
    questions,
  });
}
