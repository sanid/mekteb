import { NextRequest } from "next/server";

import {
  requireApiMember,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, unauthorized } from "@/app/api/v1/helpers/response";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: threadId } = await params;
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);
  await supabase
    .from("message_participants")
    .update({ last_read_at: new Date().toISOString(), updated_by: ctx.userId })
    .eq("thread_id", threadId)
    .eq("profile_id", ctx.userId);

  return ok({ marked_read: true });
}
