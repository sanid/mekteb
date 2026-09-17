import { NextRequest } from "next/server";

import {
  requireApiStudent,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const ctx = await requireApiStudent(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: records, error } = await supabase
    .from("attendance_records")
    .select(
      "id, status, attendance_sessions!inner(id, session_date, group_id, groups(name))",
    )
    .eq("student_profile_id", ctx.studentProfileId)
    .order("session_date", {
      ascending: false,
      referencedTable: "attendance_sessions",
    })
    .limit(120);

  if (error) return dbErr(error.message);

  const typed = (records ?? []) as unknown as Array<{
    id: string;
    status: string;
    attendance_sessions: {
      id: string;
      session_date: string;
      group_id: string;
      groups: { name: string } | null;
    } | null;
  }>;

  return ok(
    typed
      .filter((r) => r.attendance_sessions !== null)
      .map((r) => ({
        id: r.id,
        status: r.status,
        sessionId: r.attendance_sessions!.id,
        sessionDate: r.attendance_sessions!.session_date,
        groupId: r.attendance_sessions!.group_id,
        groupName: r.attendance_sessions!.groups?.name ?? "",
      })),
  );
}
