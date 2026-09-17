import {
  createSupabaseForUser,
  extractUser,
  resolveApiRole,
} from "@/app/api/v1/helpers/api-auth";
import { activePluginsForRequest } from "@/app/api/v1/helpers/plugins";

/**
 * The session payload `/auth/me` returns — and, since the sign-in route now
 * resolves the same thing in the same request, what `POST /auth/sign-in`
 * hands back too. Building it in one place keeps the two honest: a role or
 * plugin resolved at sign-in must match what the next `/auth/me` says, and a
 * client that skips the second round-trip still gets the real session.
 */
export type SessionPayload = {
  userId: string;
  email: string;
  mustRotatePassword: boolean;
  role: string;
  roles: string[];
  mosqueId: string | null;
  mosqueName: string | null;
  plugins: string[];
  profile: {
    full_name: string | null;
    display_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
};

/**
 * Resolves the full session for a request carrying a valid bearer token.
 *
 * `roles` is the full set, not just the landing role: a user can hold e.g.
 * teacher *and* examiner, and the portal switcher needs all of them. `plugins`
 * drives feature visibility — a screen for a disabled plugin must not be
 * reachable. Returns null when the token is invalid or the user was deleted.
 */
export async function loadSession(request: Request): Promise<SessionPayload | null> {
  const user = await extractUser(request);
  if (!user) return null;

  const supabase = createSupabaseForUser(request);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, display_name, phone, avatar_url")
    .eq("id", user.userId)
    .maybeSingle();

  const role = await resolveApiRole(user.userId, request);

  let mosqueId: string | null = null;
  let mosqueName: string | null = null;

  if (role !== "student" && role !== "none") {
    const { data: memberships } = await supabase
      .from("memberships")
      .select("mosque_id, mosques(name)")
      .eq("user_id", user.userId)
      .eq("is_active", true)
      .limit(1);
    const m = memberships?.[0];
    mosqueId = m?.mosque_id ?? null;
    mosqueName = (m?.mosques as { name: string } | null)?.name ?? null;
  } else if (role === "student") {
    const { data: sp } = await supabase
      .from("student_profiles")
      .select("mosque_id, mosques(name)")
      .eq("profile_id", user.userId)
      .eq("is_active", true)
      .maybeSingle();
    mosqueId = sp?.mosque_id ?? null;
    mosqueName = (sp?.mosques as { name: string } | null)?.name ?? null;
  }

  const { data: allMemberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.userId)
    .eq("is_active", true);

  const roles = [...new Set((allMemberships ?? []).map((m) => m.role as string))];
  if (role === "student" && !roles.includes("student")) roles.push("student");
  // Assistants behave like teachers everywhere the app checks `roles` — the
  // membership row says 'assistant', the UI needs 'teacher' (tab bar,
  // portal switcher, home cards).
  if (role === "teacher" && roles.includes("assistant") && !roles.includes("teacher")) {
    roles.push("teacher");
  }

  const plugins = mosqueId
    ? [...(await activePluginsForRequest(request, mosqueId))]
    : [];

  return {
    userId: user.userId,
    email: user.email,
    mustRotatePassword: user.mustRotatePassword,
    role,
    roles,
    mosqueId,
    mosqueName,
    plugins,
    profile,
  };
}
