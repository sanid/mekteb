import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiExaminer,
  createSupabaseForUser,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized, notFound } from "@/app/api/v1/helpers/response";
import { parseJson } from "@/app/api/v1/helpers/validate";
import { enqueueExamNotifications } from "@/lib/exam-notifications";

const createSchema = z.object({
  exam_session_id: z.string().uuid("A session id is required"),
  title: z.string().trim().min(1, "A title is required").max(200),
  question_ids: z
    .array(z.string().uuid())
    .min(1, "Pick at least one question")
    .max(100),
});

/**
 * Create an online written test for an exam session — the API counterpart of
 * the web `createOnlineWrittenTest` server action. The examiner picks the
 * session, gives the test a title and chooses from the question bank; the
 * server re-verifies the session belongs to the mosque and carries a student,
 * then fans out a notification to the student and their parents with the
 * token so the test opens with one tap.
 */
export async function POST(request: NextRequest) {
  const ctx = await requireApiExaminer(request);
  if (!ctx) return unauthorized();

  const parsed = await parseJson(request, createSchema);
  if (!parsed.ok) return parsed.response;
  const { exam_session_id, title, question_ids } = parsed.data;

  const supabase = await createSupabaseForUser(request);

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, student_profile_id, mosque_id")
    .eq("id", exam_session_id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!session) return notFound("Exam session not found");
  if (!session.student_profile_id) return err("This session has no student.", 409);

  const { data: existingTest } = await supabase
    .from("written_tests")
    .select("id")
    .eq("exam_session_id", exam_session_id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (existingTest) return err("This session already has a written test.", 409);

  const { data: examinerProfile } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!examinerProfile) return unauthorized("Examiner profile not found");

  // Question ids are validated against the mosque's own active bank so a
  // foreign or archived question can never be attached to the test.
  const { data: knownQuestions } = await supabase
    .from("exam_questions")
    .select("id")
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true)
    .in("id", question_ids);
  const known = new Set((knownQuestions ?? []).map((q) => q.id));
  const validIds = question_ids.filter((id) => known.has(id));
  if (validIds.length === 0) return err("None of the chosen questions exist.", 400);

  const admin = createSupabaseAdmin();
  const { data: test, error } = await admin
    .from("written_tests")
    .insert({
      mosque_id: ctx.mosqueId,
      exam_session_id,
      examiner_profile_id: examinerProfile.id,
      student_profile_id: session.student_profile_id,
      title,
      question_ids: validIds,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id, token")
    .single();
  if (error) return dbErr(error.message);

  // Notify the student and their parents, exactly like the web action.
  const { data: links } = await admin
    .from("parent_student_links")
    .select("parent_profiles(profile_id)")
    .eq("student_profile_id", session.student_profile_id)
    .eq("mosque_id", ctx.mosqueId);
  const parentIds = (links ?? [])
    .map((l) => (l.parent_profiles as { profile_id: string } | null)?.profile_id)
    .filter((id): id is string => !!id);

  const { data: studentRow } = await admin
    .from("student_profiles")
    .select("profile_id")
    .eq("id", session.student_profile_id)
    .maybeSingle();
  const studentUserId = (studentRow as { profile_id: string | null } | null)?.profile_id;

  const recipients = [...parentIds, ...(studentUserId ? [studentUserId] : [])];
  if (recipients.length > 0) {
    await enqueueExamNotifications({
      mosqueId: ctx.mosqueId,
      recipientProfileIds: recipients,
      subject: `Schriftlicher Test: ${title}`,
      body: "Ein schriftlicher Test wurde erstellt und kann in der App ausgefüllt werden.",
      templateKey: "written_test.new",
      templateParams: { title, token: test.token },
    });
  }

  return ok({ id: test.id, token: test.token }, 201);
}
