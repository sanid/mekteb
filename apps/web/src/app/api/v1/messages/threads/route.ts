import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiMember,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { parseJson, parseQuery } from "@/app/api/v1/helpers/validate";
import { writeAuditLog } from "@/lib/audit";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});

const postSchema = z.object({
  subject: z.string().trim().optional().nullable(),
  body: z.string().trim().min(1, "Message cannot be empty"),
  recipient_ids: z
    .array(z.guid())
    .min(1, "Select at least one recipient"),
});

export async function GET(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const parsedQuery = parseQuery(request, querySchema);
  if (!parsedQuery.ok) return parsedQuery.response;
  const { limit, before } = parsedQuery.data;

  const supabase = createSupabaseForUser(request);

  let baseQuery = supabase
    .from("message_threads")
    .select("id, subject, updated_at, message_participants(profile_id, last_read_at)")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (before) baseQuery = baseQuery.lt("updated_at", before);
  const { data: rawThreads, error } = await baseQuery;

  if (error) return dbErr(error.message);

  const threadIds = (rawThreads ?? []).map((t) => t.id);

  /**
   * Names via RPC, not a `profiles(...)` join: `profiles` is only selectable
   * by its owner, a platform owner or a mosque admin, so the join returned
   * null for every ordinary member and the app showed a placeholder instead
   * of who they were talking to. The function returns names only.
   */
  const { data: participantNames } = threadIds.length
    ? await supabase.rpc("thread_participant_names", { p_thread_ids: threadIds })
    : { data: [] };
  const nameByProfile = new Map<string, string | null>();
  for (const row of participantNames ?? []) nameByProfile.set(row.profile_id, row.name);

  let lastMsgs: Array<{ thread_id: string; body: string; author_profile_id: string | null }> = [];
  if (threadIds.length) {
    const { data } = await supabase
      .from("messages")
      .select("thread_id, body, author_profile_id")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false })
      .limit(threadIds.length * 3);
    lastMsgs = data ?? [];
  }

  const lastMsgMap = new Map<string, { body: string; author_profile_id: string | null }>();
  for (const msg of lastMsgs) {
    if (!lastMsgMap.has(msg.thread_id)) {
      lastMsgMap.set(msg.thread_id, {
        body: msg.body,
        author_profile_id: msg.author_profile_id,
      });
    }
  }

  const threads = (rawThreads ?? []).map((t) => {
    const parts = (
      t.message_participants ?? []
    ) as Array<{
      profile_id: string;
      last_read_at: string | null;
    }>;
    return {
      id: t.id,
      subject: t.subject,
      updated_at: t.updated_at,
      participants: parts.map((p) => ({
        profile_id: p.profile_id,
        last_read_at: p.last_read_at,
        name: nameByProfile.get(p.profile_id) ?? "—",
      })),
      lastMessage: lastMsgMap.get(t.id) ?? null,
    };
  });

  const nextCursor =
    threads.length === limit ? threads[threads.length - 1].updated_at : null;
  return ok({ threads, nextCursor });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const parsed = await parseJson(request, postSchema);
  if (!parsed.ok) return parsed.response;
  const { subject, body: messageBody, recipient_ids } = parsed.data;

  const supabase = createSupabaseForUser(request);

  const { data: thread, error: tErr } = await supabase
    .from("message_threads")
    .insert({
      mosque_id: ctx.mosqueId,
      subject: subject?.trim() || null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();
  if (tErr || !thread) return dbErr(tErr?.message);

  const allParticipants = Array.from(new Set([ctx.userId, ...recipient_ids]));
  const { error: pErr } = await supabase.from("message_participants").insert(
    allParticipants.map((profileId) => ({
      mosque_id: ctx.mosqueId,
      thread_id: thread.id,
      profile_id: profileId,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })),
  );
  if (pErr) return dbErr(pErr.message);

  const { error: mErr } = await supabase.from("messages").insert({
    mosque_id: ctx.mosqueId,
    thread_id: thread.id,
    author_profile_id: ctx.userId,
    body: messageBody.trim(),
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });
  if (mErr) return dbErr(mErr.message);

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "message.thread_created",
    targetTable: "message_threads",
    targetId: thread.id,
  });

  return ok({ threadId: thread.id }, 201);
}
