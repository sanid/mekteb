import { NextRequest } from "next/server";
import { z } from "zod";

import {
  requireApiMember,
  createSupabaseForUser,
} from "@/app/api/v1/helpers/api-auth";
import { ok, err, dbErr, unauthorized } from "@/app/api/v1/helpers/response";
import { parseQuery } from "@/app/api/v1/helpers/validate";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  /** ISO timestamp; returns rows strictly older than this (keyset paging). */
  before: z.string().datetime().optional(),
  unreadOnly: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

export async function GET(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const parsed = parseQuery(request, querySchema);
  if (!parsed.ok) return parsed.response;
  const { limit, before, unreadOnly } = parsed.data;

  const supabase = createSupabaseForUser(request);

  let query = supabase
    .from("notification_queue")
    .select(
      // The thread join is what makes a message notification tappable: the
      // row itself only names the message, and a client cannot open a thread
      // it cannot resolve.
      "id, subject, body, channel, status, is_read, created_at, source_announcement_id, source_message_id, template_key, template_params, messages:source_message_id(thread_id)",
    )
    .eq("recipient_profile_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) query = query.lt("created_at", before);
  if (unreadOnly) query = query.eq("is_read", false);

  const { data: rows, error } = await query;
  if (error) return dbErr(error.message);

  // Flatten the join away — clients get `thread_id` next to the other
  // scalars rather than a nested relation they have to know the name of.
  const notifications = (rows ?? []).map((n) => {
    const { messages, ...rest } = n as typeof n & {
      messages: { thread_id: string } | null;
    };
    return { ...rest, thread_id: messages?.thread_id ?? null };
  });

  const nextCursor =
    notifications.length === limit
      ? notifications[notifications.length - 1].created_at
      : null;

  return ok({ notifications, nextCursor });
}

export async function PUT(request: NextRequest) {
  const ctx = await requireApiMember(request);
  if (!ctx) return unauthorized();

  const supabase = createSupabaseForUser(request);
  await supabase
    .from("notification_queue")
    .update({ is_read: true })
    .eq("recipient_profile_id", ctx.userId)
    .eq("is_read", false);

  return ok({ marked_all_read: true });
}
