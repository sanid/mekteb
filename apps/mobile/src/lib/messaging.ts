import { formatDate, tm } from "./i18n";
import type { MessageThreadSummary } from "./types";

/**
 * Presentation helpers shared by the thread list and the chat screen.
 *
 * They live here rather than in a route file so the chat screen does not have
 * to import from `messages/index.tsx` — expo-router treats that as a route
 * module, and a helper import would quietly couple the two screens' lifecycles.
 */

/** Everyone in the thread except me — that is what a chat row is named after. */
export function otherParticipants(
  thread: MessageThreadSummary,
  userId: string | undefined,
) {
  const others = thread.participants.filter((p) => p.profile_id !== userId);
  return others.length ? others : thread.participants;
}

/**
 * `profiles` on a participant is subject to RLS, and a member cannot always
 * read the row of the person they are talking to (an admin's, typically) — the
 * route then hands back a literal "?" for the name, exactly as the web thread
 * list does. A neutral word beats a question mark as a chat title.
 */
export function participantName(name: string): string {
  return name === "?" ? tm("unknownParticipant") : name;
}

/**
 * Time as a chat list shows it: the clock for today, the weekday this week,
 * the date before that. Always through `formatDate`, never
 * `toLocaleDateString` (AGENTS.md §3).
 */
export function chatTimestamp(value: string): string {
  const then = new Date(value);
  const days = Math.round((Date.now() - then.getTime()) / 86_400_000);
  if (days < 1) return formatDate(then, { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return tm("yesterday");
  if (days < 7) return formatDate(then, { weekday: "short" });
  return formatDate(then, { day: "numeric", month: "short" });
}
