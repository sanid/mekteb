import { NextRequest } from "next/server";

import {
  requireApiStudent,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, notFound, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * Student acknowledges their own homework.
 *
 * The web portal did this through a server action, which a mobile client
 * cannot call — so students could see homework from the API but never mark it
 * read. Mirrors `acknowledgeHomework` in
 * `src/app/[locale]/student/homework/actions.ts`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: homeworkId } = await params;

  const ctx = await requireApiStudent(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  // RLS enforces this too; the explicit check gives a clean 404 instead of a
  // policy violation when the homework isn't theirs.
  const { data: hw } = await supabase
    .from("homework_assignments")
    .select("id")
    .eq("id", homeworkId)
    .eq("mosque_id", ctx.mosqueId)
    .eq("is_published", true)
    .maybeSingle();

  if (!hw) return notFound("Homework not found.");

  // `ignoreDuplicates` keeps the *first* acknowledgement time — re-tapping
  // must not move the timestamp a teacher may be relying on.
  const { error } = await supabase.from("homework_submissions").upsert(
    {
      mosque_id: ctx.mosqueId,
      homework_id: homeworkId,
      student_profile_id: ctx.studentProfileId,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: ctx.userId,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    },
    { onConflict: "homework_id,student_profile_id", ignoreDuplicates: true },
  );

  if (error) return dbErr(error.message);

  return ok({ acknowledged: true });
}
