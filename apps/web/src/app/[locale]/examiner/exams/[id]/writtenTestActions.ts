"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireExaminer } from "@/lib/auth";
import { enqueueExamNotifications } from "@/lib/exam-notifications";

const CreateSchema = z.object({
  exam_session_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  question_ids: z.array(z.string().uuid()).min(1).max(100),
});

export async function createOnlineWrittenTest(args: z.infer<typeof CreateSchema> & {
  origin: string;
}) {
  const ctx = await requireExaminer();
  const parsed = CreateSchema.parse(args);
  const supabase = await createClient();

  // Look up session + student on the server — don't trust client-supplied IDs
  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, student_profile_id, mosque_id")
    .eq("id", parsed.exam_session_id)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!session) throw new Error("Exam session not found");
  if (!session.student_profile_id) throw new Error("Session has no student");

  // Get examiner's teacher_profile id
  const { data: examinerProfile } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();

  if (!examinerProfile) throw new Error("Examiner profile not found");

  // Question ids must come from the mosque's own active question bank —
  // a crafted request must not attach archived or foreign-mosque questions.
  const { data: knownQuestions } = await supabase
    .from("exam_questions")
    .select("id")
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_active", true)
    .in("id", parsed.question_ids);
  const allowedIds = new Set((knownQuestions ?? []).map((q) => q.id));
  const questionIds = parsed.question_ids.filter((id) => allowedIds.has(id));
  if (questionIds.length === 0) {
    throw new Error("Keine der gewählten Fragen gehört zur eigenen Moschee");
  }

  const admin = createAdminClient();
  const { data: test, error } = await admin
    .from("written_tests")
    .insert({
      mosque_id: ctx.mosqueId,
      exam_session_id: parsed.exam_session_id,
      examiner_profile_id: examinerProfile.id,
      student_profile_id: session.student_profile_id,
      title: parsed.title,
      question_ids: questionIds,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id, token")
    .single();

  if (error) throw new Error(error.message);

  // Notify parents of the student
  const { data: links } = await admin
    .from("parent_student_links")
    .select("parent_profiles(profile_id)")
    .eq("student_profile_id", session.student_profile_id)
    .eq("mosque_id", ctx.mosqueId);

  const parentIds = (links ?? [])
    .map((l) => (l.parent_profiles as { profile_id: string } | null)?.profile_id)
    .filter((id): id is string => !!id);

  const testUrl = `${args.origin}/de/test/${test.token}`;

  // Who must hear about it: the student (this is their test to fill in) and
  // their parents. The template key + token let the app render it in the
  // reader's language and open the test with one tap.
  const { data: studentRow } = await admin
    .from("student_profiles")
    .select("profile_id")
    .eq("id", session.student_profile_id)
    .maybeSingle();
  const studentUserId = (
    studentRow as { profile_id: string | null } | null
  )?.profile_id;

  const recipients = [...parentIds, ...(studentUserId ? [studentUserId] : [])];
  if (recipients.length > 0) {
    await enqueueExamNotifications({
      mosqueId: ctx.mosqueId,
      recipientProfileIds: recipients,
      subject: `Schriftlicher Test: ${parsed.title}`,
      body: `Ein schriftlicher Test wurde erstellt. Er kann im App unter folgendem Link ausgefüllt werden:\n\n${testUrl}`,
      templateKey: "written_test.new",
      templateParams: {
        title: parsed.title,
        token: test.token,
      },
    });
  }

  revalidatePath(`/[locale]/examiner/exams/${parsed.exam_session_id}`, "page");
  return { token: test.token, testId: test.id };
}
