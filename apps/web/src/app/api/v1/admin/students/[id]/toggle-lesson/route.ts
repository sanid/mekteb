import { NextRequest } from "next/server";

import {
  requireApiAdmin,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, unauthorized } from "@/app/api/v1/helpers/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { id: studentId } = await params;

  let body: { lesson_id?: string; completed?: boolean };
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body");
  }

  const lessonId = (body.lesson_id ?? "").trim();
  const completed = body.completed === true;
  if (!lessonId) return err("lesson_id is required.");

  const supabase = await createSupabaseForUser(request);

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("id", studentId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!student) return err("Student not found in your mosque.");

  // The lesson must belong to the same mosque — a foreign lesson id would
  // otherwise pollute the completion list and skew the report card.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("mosque_id", ctx.mosqueId)
    .maybeSingle();
  if (!lesson) return err("Lesson not found in your mosque.");

  if (completed) {
    await supabase.from("lesson_completions").upsert(
      {
        mosque_id: ctx.mosqueId,
        student_profile_id: studentId,
        lesson_id: lessonId,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
      { onConflict: "student_profile_id,lesson_id" },
    );
  } else {
    await supabase
      .from("lesson_completions")
      .delete()
      .eq("student_profile_id", studentId)
      .eq("lesson_id", lessonId)
      .eq("mosque_id", ctx.mosqueId);
  }

  return ok({ lesson_id: lessonId, completed });
}
