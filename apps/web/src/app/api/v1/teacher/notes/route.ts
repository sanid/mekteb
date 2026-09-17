import { NextRequest } from "next/server";

import {
  requireApiTeacher,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function GET(request: NextRequest) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: notes, error } = await supabase
    .from("progress_notes")
    .select(
      "id, group_id, student_profile_id, body, visible_to_parents, created_at, updated_at",
    )
    .eq("author_profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId)
    .order("created_at", { ascending: false });

  if (error) return dbErr(error.message);
  return ok(notes);
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const { group_id, student_profile_id, body: noteBody, visible_to_parents = false } = body as {
    group_id?: string;
    student_profile_id?: string;
    body?: string;
    visible_to_parents?: boolean;
  };

  if (!group_id) return err("group_id is required");
  if (!student_profile_id) return err("Select a student");
  if (!noteBody?.trim()) return err("Note cannot be empty");

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase.from("progress_notes").insert({
    mosque_id: ctx.mosqueId,
    group_id,
    student_profile_id,
    author_profile_id: ctx.userId,
    body: noteBody.trim(),
    visible_to_parents,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (error) return dbErr(error.message);

  return ok({ created: true }, 201);
}
