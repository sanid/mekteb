import { NextRequest } from "next/server";

import {
  requireApiTeacher,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: noteId } = await params;
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const body = await request.json();
  const { body: noteBody, visible_to_parents = false } = body as {
    body?: string;
    visible_to_parents?: boolean;
  };

  if (!noteBody?.trim()) return err("Note cannot be empty");

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase
    .from("progress_notes")
    .update({
      body: noteBody.trim(),
      visible_to_parents,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .eq("author_profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return dbErr(error.message);

  return ok({ updated: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: noteId } = await params;
  const ctx = await requireApiTeacher(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  const { error } = await supabase
    .from("progress_notes")
    .delete()
    .eq("id", noteId)
    .eq("author_profile_id", ctx.userId)
    .eq("mosque_id", ctx.mosqueId);
  if (error) return dbErr(error.message);

  return ok({ deleted: true });
}
