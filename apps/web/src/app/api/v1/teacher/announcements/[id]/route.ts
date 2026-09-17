import { NextRequest } from "next/server";

import {
  requireApiTeacher,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * Edit and delete the caller's own announcements.
 *
 * Mirror of the admin `[id]` route, scoped to the author: a teacher may only
 * touch rows they wrote — the web teacher list has the same rule ("edit/delete
 * only ever touches the author's own rows").
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: announcementId } = await params;
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const { title, body: announcementBody, audience = "mosque", group_id, is_published = true } =
    body as {
      title?: string;
      body?: string;
      audience?: "mosque" | "group";
      group_id?: string;
      is_published?: boolean;
    };

  if (!title?.trim() || !announcementBody?.trim())
    return err("Title and body are required");
  if (audience === "group" && !group_id)
    return err("Please select a group");

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase
    .from("announcements")
    .update({
      title: title.trim(),
      body: announcementBody.trim(),
      audience,
      group_id: audience === "group" ? group_id : null,
      is_published,
      published_at: is_published ? new Date().toISOString() : null,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", announcementId)
    .eq("author_profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return dbErr(error.message);

  return ok({ updated: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: announcementId } = await params;
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("author_profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return dbErr(error.message);

  return ok({ deleted: true });
}
