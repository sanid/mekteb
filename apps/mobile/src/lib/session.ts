import * as SecureStore from "expo-secure-store";

import { api, tokens } from "./api";
import { clearCache } from "./resource";
import { unregisterFromPush } from "./push";
import { clearWidgets } from "./widget";
import { resetRealtime } from "./realtime";
import type { Locale } from "@mekteb/i18n";

/**
 * The identifier the user last signed in with (email or student username).
 *
 * Kept because changing a password revokes the tokens that were issued before
 * it: after a forced rotation the app has to sign in again to get usable
 * tokens, and asking the user to retype the login they just used would be a
 * needless dead end. Not a secret on its own — the password is never stored.
 */
const LOGIN_KEY = "mekteb.lastLogin";

/**
 * The session from the password step of a 2FA sign-in, held until the code
 * is verified. The verified session replaces it (and this pair is cleared);
 * the main `tokens` stay untouched so a failed or abandoned MFA attempt
 * never leaves a half-signed-in app behind.
 */
const PENDING_ACCESS_KEY = "mekteb.pendingAccessToken";
const PENDING_REFRESH_KEY = "mekteb.pendingRefreshToken";

export function getLastLogin(): Promise<string | null> {
  return SecureStore.getItemAsync(LOGIN_KEY);
}

export async function clearPendingMfa(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PENDING_ACCESS_KEY),
    SecureStore.deleteItemAsync(PENDING_REFRESH_KEY),
  ]);
}

/**
 * Session shape returned by `/auth/me`.
 *
 * `roles` is the full set, not just the landing role: a user can hold e.g.
 * teacher *and* examiner, and the portal switcher needs all of them
 * (AGENTS.md §0.3). `plugins` drives feature visibility — a screen for a
 * disabled plugin must not be reachable (§0.2).
 */
export type Session = {
  userId: string;
  email: string;
  role: string;
  roles: string[];
  mosqueId: string | null;
  mosqueName: string | null;
  plugins: string[];
  mustRotatePassword: boolean;
  profile: {
    full_name: string | null;
    display_name: string | null;
  } | null;
};

export type SignInResult = {
  mustRotatePassword: boolean;
  mfaRequired: boolean;
  role: string;
  /**
   * The full session, present when the sign-in completes without 2FA.
   *
   * `/auth/sign-in` now returns everything `/auth/me` would — roles, plugins,
   * mosque and profile — so the app can hand the user the home screen after a
   * single round-trip instead of signing in twice (AGENTS.md §2).
   */
  session: Session | null;
};

/**
 * `login` accepts an email (staff) **or** a mosque-qualified username for
 * students, who have no email address — `al-nour.amina`. Never label the field
 * "Email" (AGENTS.md §4).
 */
export async function signIn(login: string, password: string): Promise<SignInResult> {
  const data = await api<{
    accessToken: string;
    refreshToken: string;
    mustRotatePassword: boolean;
    mfaRequired: boolean;
    role: string;
    userId: string;
    email: string;
    roles: string[];
    mosqueId: string | null;
    mosqueName: string | null;
    plugins: string[];
    profile: Session["profile"];
  }>("/auth/sign-in", {
    method: "POST",
    body: { login: login.trim(), password },
    auth: false,
  });

  if (data.mfaRequired) {
    // Hold the password-step session aside until the code is verified; the
    // app must not treat an aal1 session as signed in (AGENTS.md §4).
    await Promise.all([
      SecureStore.setItemAsync(PENDING_ACCESS_KEY, data.accessToken),
      SecureStore.setItemAsync(PENDING_REFRESH_KEY, data.refreshToken),
      SecureStore.setItemAsync(LOGIN_KEY, login.trim()),
    ]);
  } else {
    await tokens.set(data.accessToken, data.refreshToken);
    await SecureStore.setItemAsync(LOGIN_KEY, login.trim());
  }

  return {
    mustRotatePassword: data.mustRotatePassword,
    mfaRequired: data.mfaRequired,
    role: data.role,
    session: data.mfaRequired
      ? null
      : {
          userId: data.userId,
          email: data.email,
          role: data.role,
          roles: data.roles,
          mosqueId: data.mosqueId,
          mosqueName: data.mosqueName,
          plugins: data.plugins,
          mustRotatePassword: data.mustRotatePassword,
          profile: data.profile,
        },
  };
}

/**
 * Completes a 2FA sign-in with the authenticator code.
 *
 * The pending session authenticates both calls: `/auth/mfa/challenge` opens
 * a challenge for the user's verified factor, `/auth/mfa/verify` trades the
 * code for a fresh, verified session that becomes the stored one.
 */
export async function completeMfa(code: string): Promise<void> {
  const pendingToken = await SecureStore.getItemAsync(PENDING_ACCESS_KEY);
  if (!pendingToken) throw new Error("No pending MFA session");

  const { factorId, challengeId } = await api<{
    factorId: string;
    challengeId: string;
  }>("/auth/mfa/challenge", {
    method: "POST",
    body: {},
    token: pendingToken,
  });

  const data = await api<{ accessToken: string; refreshToken: string }>(
    "/auth/mfa/verify",
    {
      method: "POST",
      body: { factorId, challengeId, code: code.trim() },
      token: pendingToken,
    },
  );

  await tokens.set(data.accessToken, data.refreshToken);
  await clearPendingMfa();
}

export function getSession() {
  return api<Session>("/auth/me");
}

/**
 * Rotates the password and repairs the session the rotation just revoked.
 *
 * Supabase invalidates the tokens issued before a password change, so by the
 * time the request resolves the keychain holds dead ones: `/auth/me` 401s and
 * the refresh token is gone too. The login identifier was kept at sign-in, and
 * the new password is right here, so the app signs in again immediately.
 *
 * Returns whether the session survived. `"signed-out"` means the identifier
 * was missing and the caller should send the user to sign-in — a dead end is
 * worse than asking them to log in again.
 */
export async function changePassword(
  current: string,
  next: string,
  confirm: string,
): Promise<"signed-in" | "signed-out"> {
  await api("/auth/change-password", {
    method: "POST",
    body: {
      current_password: current,
      new_password: next,
      confirm_password: confirm,
    },
  });

  const login = await getLastLogin();
  if (login) {
    await signIn(login, next);
    return "signed-in";
  }
  await signOut();
  return "signed-out";
}

export async function signOut() {
  // Before the tokens go: deregistering needs an authenticated call, and a
  // token left pointing at this user would keep pushing their notifications
  // to a phone somebody else is now holding.
  await unregisterFromPush();
  // A widget outlives the session: without this the next person to pick up a
  // shared family phone still sees the previous child's homework.
  await clearWidgets();
  // A live socket authenticated as the previous user must not outlive them.
  resetRealtime();

  try {
    await api("/auth/sign-out", { method: "POST" });
  } catch {
    // A failed server sign-out must not strand the user in the app.
  }
  await tokens.clear();
  // A half-finished 2FA sign-in must not survive the sign-out either.
  await clearPendingMfa();
  // Cached rows outlive the session otherwise — on a shared family phone the
  // next person to sign in would briefly see the previous child's homework.
  clearCache();
}

/** True when the mosque has this feature switched on. */
export function hasPlugin(session: Session | null, plugin: string): boolean {
  return !!session?.plugins.includes(plugin);
}

export function hasRole(session: Session | null, role: string): boolean {
  return !!session?.roles.includes(role);
}

export type { Locale };
