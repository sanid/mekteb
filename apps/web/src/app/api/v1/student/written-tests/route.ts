import { NextRequest } from "next/server";

import {
  requireApiStudent,
  createSupabaseAdmin,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * The student's written tests, newest first — the home screen banner and the
 * "not a single one" guarantee live off this. Written tests are not readable
 * through RLS by students (the web page is token-based), so this uses the
 * admin client filtered to the caller's own student profile.
 *
 * The token is returned to the owner: it is the capability to open the test
 * in the app, and the student already has it on the printed sheet.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiStudent(request);
  if (!ctx) return unauthorized();

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("written_tests")
    .select(
      "id, token, title, status, created_at, submitted_at, graded_at, overall_result, examiner_note, exam_session_id, exam_sessions(id, status, exam_date, schedule_status)",
    )
    .eq("student_profile_id", ctx.studentProfileId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return dbErr(error.message);

  return ok(data ?? []);
}
