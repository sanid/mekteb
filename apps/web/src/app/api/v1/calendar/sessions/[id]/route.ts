import { NextRequest } from "next/server";

import {
  requireApiTeacher,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized, notFound } from "@/app/api/v1/helpers/response";

/**
 * PATCH /api/v1/calendar/sessions/[id]
 *
 * Cancel or restore an upcoming lesson from the app. Guards: the caller must
 * be a teacher of the session's group (teacher_group_links), the same rule
 * the web teacher portal applies. Notifications fan out from the DB trigger
 * (`app.notify_lesson_cancelled`) — this endpoint only flips the flag.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    is_cancelled?: boolean;
    notes?: string | null;
  } | null;

  if (!body || typeof body.is_cancelled !== "boolean") {
    return err("is_cancelled is required");
  }

  const supabase = await createSupabaseForUser(request);

  const { data: session, error: sessionError } = await supabase
    .from("teaching_sessions")
    .select("id, group_id, mosque_id")
    .eq("id", id)
    .maybeSingle();
  if (sessionError) return dbErr(sessionError.message);
  if (!session) return notFound("Session not found");
  if (session.mosque_id !== ctx.mosqueId) return notFound("Session not found");
  // Category-level (legacy) sessions have no group to be a teacher of.
  if (!session.group_id) return notFound("Session not found");

  // Teachers may only touch sessions of groups they teach.
  const { data: link } = await supabase
    .from("teacher_group_links")
    .select("id")
    .eq("teacher_profile_id", ctx.teacherProfileId)
    .eq("group_id", session.group_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!link) return err("Not a teacher of this group");

  const notes =
    body.is_cancelled && typeof body.notes === "string" && body.notes.trim() !== ""
      ? body.notes.trim().slice(0, 500)
      : null;

  const { error } = await supabase
    .from("teaching_sessions")
    .update({
      is_cancelled: body.is_cancelled,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("mosque_id", ctx.mosqueId);

  if (error) return dbErr(error.message);
  return ok({ ok: true });
}
