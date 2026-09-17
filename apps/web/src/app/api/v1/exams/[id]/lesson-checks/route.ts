import { NextRequest } from "next/server";

import {
  requireApiMember,
  requireApiExaminer,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, notFound, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * The checklist behind an exam: the mosque's curriculum (published lessons in
 * library order) plus which lessons are already ticked off for this session.
 *
 * Readable by anyone who can read the session — the examiner ticks it, the
 * requesting teacher and the family read the result. The write route below
 * is what actually changes ticks; here RLS decides who gets rows.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  // RLS on exam_sessions decides whether this caller may look at all.
  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!session) return notFound("Exam session not found");

  const lessonsQuery = supabase
    .from("lessons")
    .select("id, title, sort_order")
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  const checksQuery = supabase
    .from("exam_lesson_results")
    .select("lesson_id")
    .eq("exam_session_id", sessionId);

  const [lessonsRes, checksRes] = await Promise.all([lessonsQuery, checksQuery]);

  if (lessonsRes.error) return dbErr(lessonsRes.error.message);
  if (checksRes.error) return dbErr(checksRes.error.message);

  return ok({
    lessons: lessonsRes.data ?? [],
    checked: (checksRes.data ?? []).map((c) => c.lesson_id),
  });
}

/**
 * Tick or untick one lesson. A tick upserts the row (the lesson was recited
 * correctly); unticking removes it, so "not ticked" is simply absent — the
 * result list renders it as needing repetition.
 *
 * RLS enforces the two rules that matter: only the session's own examiner
 * (or an admin) can write, and never after the result is terminal.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const ctx = await requireApiExaminer(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const lessonId = String(body.lesson_id ?? "").trim();
  if (!lessonId) return err("lesson_id is required");
  const passed = body.passed !== false;

  const supabase = await createSupabaseForUser(request);

  if (passed) {
    const { error } = await supabase.from("exam_lesson_results").upsert(
      {
        mosque_id: ctx.mosqueId,
        exam_session_id: sessionId,
        lesson_id: lessonId,
        passed: true,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "exam_session_id,lesson_id" },
    );
    if (error) return dbErr(error.message);
  } else {
    const { error } = await supabase
      .from("exam_lesson_results")
      .delete()
      .eq("exam_session_id", sessionId)
      .eq("lesson_id", lessonId);
    if (error) return dbErr(error.message);
  }

  return ok({ lesson_id: lessonId, passed });
}
