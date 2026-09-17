import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiMember,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { writeAuditLog } from "@/lib/audit";
import { parseJson } from "@/app/api/v1/helpers/validate";

const sendMessageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: threadId } = await params;
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const supabase = await createSupabaseForUser(request);

  const { data: participant } = await supabase
    .from("message_participants")
    .select("id")
    .eq("thread_id", threadId)
    .eq("profile_id", ctx.userId)
    .maybeSingle();
  if (!participant) return err("Not a participant in this thread", 403);

  const { data: thread, error } = await supabase
    .from("message_threads")
    .select(
      "id, subject, created_at, updated_at, message_participants(profile_id, last_read_at)",
    )
    .eq("id", threadId)
    .single();
  if (error || !thread) return err("Thread not found", 404);

  /**
   * Names via RPC — see the thread list route. Kept in the same nested shape
   * the client already reads (`message_participants[].profiles.display_name`)
   * so this fix does not also become a wire-format change.
   */
  const { data: participantNames } = await supabase.rpc("thread_participant_names", {
    p_thread_ids: [threadId],
  });
  const nameByProfile = new Map<string, string | null>();
  for (const row of participantNames ?? []) nameByProfile.set(row.profile_id, row.name);

  const participants = (
    thread.message_participants ?? []
  ).map((p) => ({
    ...p,
    profiles: {
      // A null `profile_id` is a deleted account — there is no name to find.
      full_name: p.profile_id ? (nameByProfile.get(p.profile_id) ?? null) : null,
      display_name: null,
    },
  }));

  const { data: messages } = await supabase
    .from("messages")
    .select("id, author_profile_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  return ok({
    thread: { ...thread, message_participants: participants },
    messages: messages ?? [],
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: threadId } = await params;
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const parsed = await parseJson(request, sendMessageSchema);
  if (!parsed.ok) return parsed.response;
  const { body: messageBody } = parsed.data;

  const supabase = await createSupabaseForUser(request);

  const { data: participant } = await supabase
    .from("message_participants")
    .select("id")
    .eq("thread_id", threadId)
    .eq("profile_id", ctx.userId)
    .maybeSingle();
  if (!participant) return err("Not a participant in this thread", 403);

  const { error } = await supabase.from("messages").insert({
    mosque_id: ctx.mosqueId,
    thread_id: threadId,
    author_profile_id: ctx.userId,
    body: messageBody,
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (error) return dbErr(error.message);

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "message.sent",
    targetTable: "messages",
    targetId: threadId,
  });

  return ok({ sent: true });
}
