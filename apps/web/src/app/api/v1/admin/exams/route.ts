import { NextRequest } from "next/server";
import { requireApiAdmin, createSupabaseForUser } from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const ctx = await requireApiAdmin(request);
  if (!ctx) return unauthorized();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";
  const groupId = searchParams.get("group") ?? "";

  const supabase = await createSupabaseForUser(request);

  let sessionsQuery = supabase
    .from("exam_sessions")
    .select(
      "id, status, summary, exam_date, diploma_generated_at, exam_request_id, examiner_profile_id, student_profiles(full_name), groups!exam_sessions_from_group_id_fkey(id, name), teacher_profiles!exam_sessions_examiner_profile_id_fkey(profiles(full_name))",
    )
    .eq("mosque_id", ctx.mosqueId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (status) sessionsQuery = sessionsQuery.eq("status", status);
  if (groupId) sessionsQuery = sessionsQuery.eq("from_group_id", groupId);

  const [sessionsResult, requestsResult] = await Promise.all([
    sessionsQuery,
    supabase
      .from("exam_requests")
      .select(
        "id, notes, created_at, student_profiles(full_name), groups(name), teacher_profiles(profiles(full_name))",
      )
      .eq("mosque_id", ctx.mosqueId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  if (sessionsResult.error) return dbErr(sessionsResult.error.message);
  if (requestsResult.error) return dbErr(requestsResult.error.message);

  return ok({
    sessions: sessionsResult.data,
    pendingRequests: requestsResult.data,
  });
}
