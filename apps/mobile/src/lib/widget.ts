import { api } from "./api";
import { buildPayload, type WidgetApiResponse } from "./widget-format";
import { writeWidgetPayload } from "./widget-bridge";

export type { WidgetPayload } from "./widget-format";

/**
 * Getting the payload to the widgets.
 *
 * A widget **cannot call the API or run this app's JavaScript** (AGENTS.md §8):
 * it reads what the app last wrote into shared native storage. So the app has
 * to write whenever it has fresh data, and what it writes is already
 * translated and formatted — see `widget-format.ts`.
 */
/**
 * Refreshes the widgets from the API. Safe to call often — it is one request,
 * and it never throws: a widget that is a few hours stale is a much smaller
 * problem than a screen that fails to load because its widget refresh did.
 */
export async function refreshWidgets(): Promise<void> {
  try {
    const data = await api<WidgetApiResponse>("/widget");
    await writeWidgetPayload(buildPayload(data));
  } catch {
    // Offline, signed out, or no native widget support on this build.
  }
}

/**
 * Blanks the widgets on sign-out.
 *
 * A home-screen widget outlives the app session: without this, the next person
 * to pick up a shared family phone would still see the previous child's
 * homework on the lock screen, with no way to open it.
 */
export async function clearWidgets(): Promise<void> {
  try {
    await writeWidgetPayload(null);
  } catch {
    // Nothing to do — the payload is best-effort by design.
  }
}
