import { createClient } from "@/lib/supabase/server";
import type { ThreadPreview } from "@/components/messaging/ThreadListPanel";
import type { ContactRecipient } from "@/components/messaging/NewChatButton";

/**
 * Fetches the thread list preview and available recipients for the messages
 * sidebar.
 *
 * Recipients are resolved entirely by `app.messaging_contacts()`, which
 * encodes the per-role rules (admins always visible; parents see their
 * children's teachers; teachers see their groups' parents + peer teachers).
 * Callers therefore do not — and cannot — pass a role filter.
 */
export async function getMessagingData(
  userId: string,
  mosqueId: string,
): Promise<{ threads: ThreadPreview[]; recipients: ContactRecipient[] }> {
  const supabase = await createClient();

  // Thread list
  const { data: rawThreads } = await supabase
    .from("message_threads")
    .select("id, updated_at, message_participants(profile_id, last_read_at)")
    .order("updated_at", { ascending: false })
    .limit(50);

  const threadIds = (rawThreads ?? []).map((t) => t.id);

  /**
   * Names come from an RPC, not from a `profiles(...)` join. `profiles` is
   * only selectable by its owner, a platform owner or a mosque admin, so the
   * join returned null for everyone else and every chat partner rendered as
   * "User". The function returns names only, for threads the caller is in —
   * opening `profiles` up instead would also expose `phone`.
   */
  const { data: participantNames } = threadIds.length
    ? await supabase.rpc("thread_participant_names", { p_thread_ids: threadIds })
    : { data: [] };

  const nameByProfile = new Map<string, string | null>();
  for (const row of participantNames ?? []) {
    nameByProfile.set(row.profile_id, row.name);
  }

  // Last message per thread (for preview text)
  const { data: lastMsgs } = threadIds.length
    ? await supabase
        .from("messages")
        .select("thread_id, body, author_profile_id")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false })
        .limit(threadIds.length * 3)
    : { data: [] };

  const lastMsgMap = new Map<
    string,
    { body: string; author_profile_id: string | null }
  >();
  for (const msg of lastMsgs ?? []) {
    if (!lastMsgMap.has(msg.thread_id)) {
      lastMsgMap.set(msg.thread_id, {
        body: msg.body,
        author_profile_id: msg.author_profile_id,
      });
    }
  }

  const threads: ThreadPreview[] = (rawThreads ?? []).map((t) => {
    const parts = (
      t.message_participants ?? []
    ) as Array<{
      profile_id: string | null;
      last_read_at: string | null;
    }>;
    return {
      id: t.id,
      updated_at: t.updated_at,
      participants: parts.map((p) => {
        const name = p.profile_id ? nameByProfile.get(p.profile_id) : null;
        // A participant with no profile row is a deleted account; one whose
        // name is blank is a profile that was never filled in.
        const deleted = p.profile_id === null || name === undefined;
        return {
          profile_id: p.profile_id,
          last_read_at: p.last_read_at,
          deleted,
          name: deleted ? "User" : (name ?? "?"),
        };
      }),
      lastMessage: lastMsgMap.get(t.id) ?? null,
    };
  });

  // Recipients via security-definer RPC. The function applies the per-role
  // rules itself, so we just hand it the mosque and use what comes back.
  const { data: contacts } = await supabase.rpc("messaging_contacts", {
    p_mosque_id: mosqueId,
  });

  const recipients: ContactRecipient[] = (contacts ?? []).map(
    (c: { profile_id: string; name: string | null; role: string }) => ({
      id: c.profile_id,
      name: c.name ?? c.profile_id,
      role: c.role,
    }),
  );

  return { threads, recipients };
}
