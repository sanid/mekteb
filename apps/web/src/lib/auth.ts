import { cache } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getActiveMosqueCookie } from "@/lib/mosque-session";
import { getMosqueForRequest } from "@/lib/mosque-from-slug";

export type AdminContext = {
  userId: string;
  email: string;
  mosqueId: string;
  mosqueName: string;
};

export type UserContext = {
  userId: string;
  email: string;
  mustRotatePassword: boolean;
};

export type TeacherContext = {
  userId: string;
  email: string;
  mosqueId: string;
  mosqueName: string;
  /** Row id from `teacher_profiles` — use for teacher_group_links queries. */
  teacherProfileId: string;
};

export type ExaminerContext = {
  userId: string;
  email: string;
  mosqueId: string;
  mosqueName: string;
  /** Row id from `teacher_profiles` — examiners are teachers with an examiner membership. */
  teacherProfileId: string;
};

export type ParentContext = {
  userId: string;
  email: string;
  mosqueId: string;
  mosqueName: string;
  /** Row id from `parent_profiles` — use for parent_student_links queries. */
  parentProfileId: string;
};

export type StudentContext = {
  userId: string;
  email: string;
  mosqueId: string;
  mosqueName: string;
  /** Row id from `student_profiles` — use for data queries. */
  studentProfileId: string;
  fullName: string;
};

export type PrimaryRole = "platform_owner" | "mosque_admin" | "teacher" | "examiner" | "parent" | "student" | "none";

export function resolvePrimaryRole(
  memberships: { role: string }[],
  hasStudentProfile: boolean,
): PrimaryRole {
  const roles = new Set(memberships.map((m) => m.role));
  if (roles.has("platform_owner")) return "platform_owner";
  if (roles.has("mosque_admin")) return "mosque_admin";
  // Teachers who also examine land in the teacher portal; the portal
  // switcher reaches the examiner view. Assistants behave like teachers (see
  // 20260817000003) and hold the same staff permissions.
  if (roles.has("teacher") || roles.has("assistant")) return "teacher";
  if (roles.has("examiner")) return "examiner";
  if (roles.has("parent")) return "parent";
  if (hasStudentProfile) return "student";
  return "none";
}

/**
 * Ensures the caller is signed in. Used by pages that are role-agnostic
 * (e.g. /change-password). Does NOT redirect on must_rotate_password so the
 * rotation page itself remains reachable.
 */
/** One `auth.getUser()` round trip per request, shared by every guard. */
const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }
  return user;
});

const getMustRotate = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("must_rotate_password")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(profile?.must_rotate_password);
});

export const requireUser = cache(async (): Promise<UserContext> => {
  const user = await getAuthUser();
  return {
    userId: user.id,
    email: user.email ?? "",
    mustRotatePassword: await getMustRotate(user.id),
  };
});

/**
 * Role guard core: after the auth check, the password-rotation flag, the
 * membership and the role profile are fetched in parallel (one round trip
 * instead of three sequential ones). The role profile is matched to the
 * membership's mosque in memory.
 */
async function loadRole(
  roles: Array<"teacher" | "assistant" | "examiner" | "parent">,
  profileTable: "teacher_profiles" | "parent_profiles",
) {
  const user = await getAuthUser();
  const supabase = await createClient();
  const [mustRotate, { data: memberships }, { data: roleProfiles }] = await Promise.all([
    getMustRotate(user.id),
    supabase
      .from("memberships")
      .select("mosque_id, mosques(name)")
      .eq("user_id", user.id)
      .in("role", roles)
      .eq("is_active", true)
      .limit(1),
    supabase
      .from(profileTable)
      .select("id, mosque_id")
      .eq("profile_id", user.id)
      .eq("is_active", true),
  ]);
  const locale = await getLocale();
  if (mustRotate) redirect(`/${locale}/change-password`);
  const membership = memberships?.[0];
  if (!membership) redirect(`/${locale}/no-access`);
  const roleProfile = (roleProfiles ?? []).find((r) => r.mosque_id === membership.mosque_id);
  // A membership without its role-profile row is a data bug, not a
  // user-facing case — send them to /no-access rather than crashing.
  if (!roleProfile) redirect(`/${locale}/no-access`);
  return {
    userId: user.id,
    email: user.email ?? "",
    mosqueId: membership.mosque_id,
    mosqueName: (membership.mosques as { name: string } | null)?.name ?? "Mosque",
    roleProfileId: roleProfile.id,
  };
}

/**
 * Loads the signed-in user and their first admin mosque. Redirects to
 * /login if not authenticated, /change-password if a password rotation is
 * required, or /no-access if the user has no mosque_admin membership.
 */
export const requireAdmin = cache(async (): Promise<AdminContext> => {
  const user = await requireUser();
  const locale = await getLocale();
  if (user.mustRotatePassword) redirect(`/${locale}/change-password`);

  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("mosque_id, mosques(name)")
    .eq("user_id", user.userId)
    .eq("role", "mosque_admin")
    .eq("is_active", true);

  if (!memberships || memberships.length === 0) redirect(`/${locale}/no-access`);

  // Subdomain is authoritative: if the request arrived via {slug}.mekteb.de,
  // lock the context to that mosque. Falls back to cookie, then first membership.
  const slugMosque = await getMosqueForRequest();
  const activeCookieId = await getActiveMosqueCookie();

  const preferredId = slugMosque?.id ?? activeCookieId;
  const membership =
    memberships.find((m) => m.mosque_id === preferredId) ?? memberships[0];

  // If subdomain specifies a mosque the user has no admin access to, block them.
  if (slugMosque && membership.mosque_id !== slugMosque.id) {
    redirect(`/${locale}/no-access`);
  }

  const mosqueName =
    (membership.mosques as { name: string } | null)?.name ?? "Mosque";

  return {
    userId: user.userId,
    email: user.email,
    mosqueId: membership.mosque_id,
    mosqueName,
  };
});

/**
 * Loads the signed-in user and their first teacher membership + teacher
 * profile. Mirrors requireAdmin but for the teacher portal. Admins who are
 * NOT also teachers get bounced to /no-access (not /admin) because they
 * navigated here intentionally.
 */
export const requireTeacher = cache(async (): Promise<TeacherContext> => {
  const { roleProfileId, ...rest } = await loadRole(["teacher", "assistant"], "teacher_profiles");
  return { ...rest, teacherProfileId: roleProfileId };
});

/**
 * Loads the signed-in user as an examiner. Examiners must have both an
 * `examiner` membership and a `teacher_profiles` row (they are teachers
 * with extra privileges).
 */
export const requireExaminer = cache(async (): Promise<ExaminerContext> => {
  const { roleProfileId, ...rest } = await loadRole(["examiner"], "teacher_profiles");
  return { ...rest, teacherProfileId: roleProfileId };
});

/**
 * Loads the signed-in user and their first parent membership + parent
 * profile. Mirrors requireTeacher for the parent portal.
 */
export const requireParent = cache(async (): Promise<ParentContext> => {
  const { roleProfileId, ...rest } = await loadRole(["parent"], "parent_profiles");
  return { ...rest, parentProfileId: roleProfileId };
});

/**
 * Loads the signed-in user and their student profile. Students do NOT
 * have rows in the memberships table — they authenticate via
 * student_profiles.profile_id = auth.uid().
 */
export const requireStudent = cache(async (): Promise<StudentContext> => {
  const user = await requireUser();
  const locale = await getLocale();
  if (user.mustRotatePassword) redirect(`/${locale}/change-password`);

  const supabase = await createClient();
  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("id, mosque_id, full_name, mosques(name)")
    .eq("profile_id", user.userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!studentProfile) redirect(`/${locale}/no-access`);

  const mosqueName =
    (studentProfile.mosques as { name: string } | null)?.name ?? "Mosque";

  return {
    userId: user.userId,
    email: user.email,
    mosqueId: studentProfile.mosque_id,
    mosqueName,
    studentProfileId: studentProfile.id,
    fullName: studentProfile.full_name,
  };
});

export type MemberContext = {
  userId: string;
  mosqueId: string;
};

/**
 * Minimal auth guard for features that are role-agnostic (messaging,
 * notifications). Returns userId + mosqueId for the first active membership.
 */
export const requireMember = cache(async (): Promise<MemberContext> => {
  const user = await requireUser();
  const locale = await getLocale();
  if (user.mustRotatePassword) redirect(`/${locale}/change-password`);

  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("mosque_id")
    .eq("user_id", user.userId)
    .eq("is_active", true)
    .limit(1);

  const membership = memberships?.[0];
  if (!membership) redirect(`/${locale}/no-access`);

  return { userId: user.userId, mosqueId: membership.mosque_id };
});

export type PlatformOwnerContext = {
  userId: string;
  email: string;
};

/**
 * Restricts a route to platform owners. Redirects to /no-access for anyone
 * else. Platform owners are identified by a membership row with role
 * 'platform_owner' (no mosque scoping needed).
 */
export const requirePlatformOwner = cache(async (): Promise<PlatformOwnerContext> => {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.userId)
    .eq("role", "platform_owner")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!data) {
    const locale = await getLocale();
    redirect(`/${locale}/no-access`);
  }

  return { userId: user.userId, email: user.email };
});

/**
 * Returns the signed-in user's primary role for routing purposes. Picks
 * admin over teacher over parent if the user holds multiple memberships
 * (matches the ordering in app.has_role style checks).
 */
export async function primaryRole(userId: string): Promise<PrimaryRole> {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("is_active", true);

  const roles = new Set((memberships ?? []).map((m) => m.role));
  if (roles.has("platform_owner")) return "platform_owner";
  if (roles.has("mosque_admin")) return "mosque_admin";
  if (roles.has("teacher") || roles.has("assistant")) return "teacher";
  if (roles.has("examiner")) return "examiner";
  if (roles.has("parent")) return "parent";

  // Students have no membership rows — check student_profiles instead.
  const { data: sp } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (sp) return "student";

  return "none";
}
