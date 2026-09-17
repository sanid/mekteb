import { NextRequest } from "next/server";

import {
  requireApiTeacher,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

/**
 * The teacher's own announcements, drafts included — the mobile "my
 * announcements" screen needs the rows web's teacher announcements page
 * loads server-side, and the create route below already establishes the
 * author + audience shape.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  const { data, error } = await supabase
    .from("announcements")
    .select(
      "id, title, body, audience, group_id, is_published, published_at, created_at",
    )
    .eq("mosque_id", ctx.mosqueId)
    .eq("author_profile_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return dbErr(error.message);
  return ok(data ?? []);
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const { title, body: announcementBody, audience = "mosque", group_id } = body as {
    title?: string;
    body?: string;
    audience?: "mosque" | "group";
    group_id?: string;
  };

  if (!title?.trim() || !announcementBody?.trim())
    return err("Title and body are required");
  if (audience === "group" && !group_id)
    return err("Please select a group");

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase.from("announcements").insert({
    mosque_id: ctx.mosqueId,
    author_profile_id: ctx.userId,
    title: title.trim(),
    body: announcementBody.trim(),
    audience,
    group_id: audience === "group" ? group_id : null,
    is_published: true,
    published_at: new Date().toISOString(),
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (error) return dbErr(error.message);

  return ok({ created: true }, 201);
}
