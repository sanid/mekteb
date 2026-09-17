import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export type ApiUserContext = {
  userId: string;
  email: string;
  mustRotatePassword: boolean;
};

export type ApiAdminContext = ApiUserContext & {
  mosqueId: string;
  mosqueName: string;
};

export type ApiTeacherContext = ApiUserContext & {
  mosqueId: string;
  mosqueName: string;
  teacherProfileId: string;
};

export type ApiExaminerContext = ApiUserContext & {
  mosqueId: string;
  mosqueName: string;
  teacherProfileId: string;
};

export type ApiParentContext = ApiUserContext & {
  mosqueId: string;
  mosqueName: string;
  parentProfileId: string;
};

export type ApiStudentContext = ApiUserContext & {
  mosqueId: string;
  mosqueName: string;
  studentProfileId: string;
  fullName: string;
};

export type ApiMemberContext = {
  userId: string;
  email: string;
  mosqueId: string;
};

export type ApiRole =
  | "mosque_admin"
  | "examiner"
  | "teacher"
  | "parent"
  | "student"
  | "none";

type SupaClient = ReturnType<typeof createServerClient<Database>>;

type Cache = {
  token: string;
  user?: ApiUserContext | null;
  client?: SupaClient;
  role?: ApiRole;
  adminMembership?: { mosqueId: string; mosqueName: string } | null;
  teacherMembership?: { mosqueId: string; mosqueName: string } | null;
  examinerMembership?: { mosqueId: string; mosqueName: string } | null;
  parentMembership?: { mosqueId: string; mosqueName: string } | null;
  teacherProfileId?: string | null;
  examinerProfileId?: string | null;
  parentProfileId?: string | null;
  studentProfile?:
    | { id: string; mosqueId: string; mosqueName: string; fullName: string }
    | null;
  anyMembership?: { mosqueId: string } | null;
};

const REQ_CACHE = new WeakMap<Request, Cache>();

function bearer(request: Request): string {
  const h = request.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : "";
}

function getCache(request: Request): Cache {
  let c = REQ_CACHE.get(request);
  if (!c) {
    c = { token: bearer(request) };
    REQ_CACHE.set(request, c);
  }
  return c;
}

export function createSupabaseForUser(request: Request): SupaClient {
  const c = getCache(request);
  if (c.client) return c.client;
  c.client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: `Bearer ${c.token}` } },
    },
  );
  return c.client;
}

export function createSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function extractUser(
  request: Request,
): Promise<ApiUserContext | null> {
  const c = getCache(request);
  if (c.user !== undefined) return c.user ?? null;
  if (!c.token) {
    c.user = null;
    return null;
  }

  const supabase = createSupabaseForUser(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    c.user = null;
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_rotate_password")
    .eq("id", user.id)
    .maybeSingle();

  c.user = {
    userId: user.id,
    email: user.email ?? "",
    mustRotatePassword: Boolean(profile?.must_rotate_password),
  };
  return c.user;
}

export async function requireApiUser(request: Request) {
  const user = await extractUser(request);
  if (!user || user.mustRotatePassword) return null;
  return user;
}

async function loadAdminMembership(request: Request) {
  const c = getCache(request);
  if (c.adminMembership !== undefined) return c.adminMembership;
  const user = await extractUser(request);
  if (!user) {
    c.adminMembership = null;
    return null;
  }
  const supabase = createSupabaseForUser(request);
  const { data } = await supabase
    .from("memberships")
    .select("mosque_id, mosques(name)")
    .eq("user_id", user.userId)
    .eq("role", "mosque_admin")
    .eq("is_active", true)
    .limit(1);
  const m = data?.[0];
  c.adminMembership = m
    ? {
        mosqueId: m.mosque_id,
        mosqueName:
          (m.mosques as { name: string } | null)?.name ?? "Mosque",
      }
    : null;
  return c.adminMembership;
}

async function loadTeacherProfile(request: Request) {
  const c = getCache(request);
  if (c.teacherMembership !== undefined && c.teacherProfileId !== undefined) {
    if (!c.teacherMembership || !c.teacherProfileId) return null;
    return { membership: c.teacherMembership, teacherProfileId: c.teacherProfileId };
  }
  const user = await extractUser(request);
  if (!user) {
    c.teacherMembership = null;
    c.teacherProfileId = null;
    return null;
  }
  const supabase = createSupabaseForUser(request);
  const { data: memberships } = await supabase
    .from("memberships")
    .select("mosque_id, mosques(name)")
    .eq("user_id", user.userId)
    .in("role", ["teacher", "assistant"])
    .eq("is_active", true)
    .limit(1);
  const m = memberships?.[0];
  if (!m) {
    c.teacherMembership = null;
    c.teacherProfileId = null;
    return null;
  }
  const { data: tp } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("mosque_id", m.mosque_id)
    .eq("profile_id", user.userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!tp) {
    c.teacherMembership = null;
    c.teacherProfileId = null;
    return null;
  }
  c.teacherMembership = {
    mosqueId: m.mosque_id,
    mosqueName: (m.mosques as { name: string } | null)?.name ?? "Mosque",
  };
  c.teacherProfileId = tp.id;
  return { membership: c.teacherMembership, teacherProfileId: tp.id };
}

async function loadExaminerProfile(request: Request) {
  const c = getCache(request);
  if (c.examinerMembership !== undefined && c.examinerProfileId !== undefined) {
    if (!c.examinerMembership || !c.examinerProfileId) return null;
    return { membership: c.examinerMembership, examinerProfileId: c.examinerProfileId };
  }
  const user = await extractUser(request);
  if (!user) {
    c.examinerMembership = null;
    c.examinerProfileId = null;
    return null;
  }
  const supabase = createSupabaseForUser(request);
  const { data: memberships } = await supabase
    .from("memberships")
    .select("mosque_id, mosques(name)")
    .eq("user_id", user.userId)
    .eq("role", "examiner")
    .eq("is_active", true)
    .limit(1);
  const m = memberships?.[0];
  if (!m) {
    c.examinerMembership = null;
    c.examinerProfileId = null;
    return null;
  }
  const { data: tp } = await supabase
    .from("teacher_profiles")
    .select("id")
    .eq("mosque_id", m.mosque_id)
    .eq("profile_id", user.userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!tp) {
    c.examinerMembership = null;
    c.examinerProfileId = null;
    return null;
  }
  c.examinerMembership = {
    mosqueId: m.mosque_id,
    mosqueName: (m.mosques as { name: string } | null)?.name ?? "Mosque",
  };
  c.examinerProfileId = tp.id;
  return { membership: c.examinerMembership, examinerProfileId: tp.id };
}

async function loadParentProfile(request: Request) {
  const c = getCache(request);
  if (c.parentMembership !== undefined && c.parentProfileId !== undefined) {
    if (!c.parentMembership || !c.parentProfileId) return null;
    return { membership: c.parentMembership, parentProfileId: c.parentProfileId };
  }
  const user = await extractUser(request);
  if (!user) {
    c.parentMembership = null;
    c.parentProfileId = null;
    return null;
  }
  const supabase = createSupabaseForUser(request);
  const { data: memberships } = await supabase
    .from("memberships")
    .select("mosque_id, mosques(name)")
    .eq("user_id", user.userId)
    .eq("role", "parent")
    .eq("is_active", true)
    .limit(1);
  const m = memberships?.[0];
  if (!m) {
    c.parentMembership = null;
    c.parentProfileId = null;
    return null;
  }
  const { data: pp } = await supabase
    .from("parent_profiles")
    .select("id")
    .eq("mosque_id", m.mosque_id)
    .eq("profile_id", user.userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!pp) {
    c.parentMembership = null;
    c.parentProfileId = null;
    return null;
  }
  c.parentMembership = {
    mosqueId: m.mosque_id,
    mosqueName: (m.mosques as { name: string } | null)?.name ?? "Mosque",
  };
  c.parentProfileId = pp.id;
  return { membership: c.parentMembership, parentProfileId: pp.id };
}

async function loadStudentProfile(request: Request) {
  const c = getCache(request);
  if (c.studentProfile !== undefined) return c.studentProfile;
  const user = await extractUser(request);
  if (!user) {
    c.studentProfile = null;
    return null;
  }
  const supabase = createSupabaseForUser(request);
  const { data: sp } = await supabase
    .from("student_profiles")
    .select("id, mosque_id, full_name, mosques(name)")
    .eq("profile_id", user.userId)
    .eq("is_active", true)
    .maybeSingle();
  c.studentProfile = sp
    ? {
        id: sp.id,
        mosqueId: sp.mosque_id,
        mosqueName:
          (sp.mosques as { name: string } | null)?.name ?? "Mosque",
        fullName: sp.full_name,
      }
    : null;
  return c.studentProfile;
}

export async function requireApiAdmin(
  request: Request,
): Promise<ApiAdminContext | null> {
  const user = await extractUser(request);
  if (!user || user.mustRotatePassword) return null;
  const m = await loadAdminMembership(request);
  if (!m) return null;
  return { ...user, mosqueId: m.mosqueId, mosqueName: m.mosqueName };
}

export async function requireApiTeacher(
  request: Request,
): Promise<ApiTeacherContext | null> {
  const user = await extractUser(request);
  if (!user || user.mustRotatePassword) return null;
  const t = await loadTeacherProfile(request);
  if (!t) return null;
  return {
    ...user,
    mosqueId: t.membership.mosqueId,
    mosqueName: t.membership.mosqueName,
    teacherProfileId: t.teacherProfileId,
  };
}

export async function requireApiExaminer(
  request: Request,
): Promise<ApiExaminerContext | null> {
  const user = await extractUser(request);
  if (!user || user.mustRotatePassword) return null;
  const ex = await loadExaminerProfile(request);
  if (!ex) return null;
  return {
    ...user,
    mosqueId: ex.membership.mosqueId,
    mosqueName: ex.membership.mosqueName,
    teacherProfileId: ex.examinerProfileId,
  };
}

export async function requireApiParent(
  request: Request,
): Promise<ApiParentContext | null> {
  const user = await extractUser(request);
  if (!user || user.mustRotatePassword) return null;
  const p = await loadParentProfile(request);
  if (!p) return null;
  return {
    ...user,
    mosqueId: p.membership.mosqueId,
    mosqueName: p.membership.mosqueName,
    parentProfileId: p.parentProfileId,
  };
}

export async function requireApiStudent(
  request: Request,
): Promise<ApiStudentContext | null> {
  const user = await extractUser(request);
  if (!user || user.mustRotatePassword) return null;
  const sp = await loadStudentProfile(request);
  if (!sp) return null;
  return {
    ...user,
    mosqueId: sp.mosqueId,
    mosqueName: sp.mosqueName,
    studentProfileId: sp.id,
    fullName: sp.fullName,
  };
}

export async function requireApiMember(
  request: Request,
): Promise<ApiMemberContext | null> {
  const user = await extractUser(request);
  if (!user || user.mustRotatePassword) return null;
  const c = getCache(request);
  if (c.anyMembership === undefined) {
    const supabase = createSupabaseForUser(request);
    const { data } = await supabase
      .from("memberships")
      .select("mosque_id")
      .eq("user_id", user.userId)
      .eq("is_active", true)
      .limit(1);
    c.anyMembership = data?.[0] ? { mosqueId: data[0].mosque_id } : null;
  }
  if (!c.anyMembership) {
    // Students aren't in memberships; fall back to student profile.
    const sp = await loadStudentProfile(request);
    if (!sp) return null;
    return { userId: user.userId, email: user.email, mosqueId: sp.mosqueId };
  }
  return {
    userId: user.userId,
    email: user.email,
    mosqueId: c.anyMembership.mosqueId,
  };
}

export async function resolveApiRole(
  userId: string,
  request: Request,
): Promise<ApiRole> {
  const c = getCache(request);
  if (c.role !== undefined) return c.role;

  // Try cached membership lookups in role-priority order.
  const admin = await loadAdminMembership(request);
  if (admin) {
    c.role = "mosque_admin";
    return c.role;
  }
  const examiner = await loadExaminerProfile(request);
  if (examiner) {
    c.role = "examiner";
    return c.role;
  }
  const teacher = await loadTeacherProfile(request);
  if (teacher) {
    c.role = "teacher";
    return c.role;
  }
  const parent = await loadParentProfile(request);
  if (parent) {
    c.role = "parent";
    return c.role;
  }
  const student = await loadStudentProfile(request);
  if (student) {
    c.role = "student";
    return c.role;
  }

  // userId arg kept for API back-compat; userId is derived from token above.
  void userId;
  c.role = "none";
  return c.role;
}

/**
 * Verifies that the given group belongs to the actor's mosque.
 * Returns the group's mosque_id when valid; null otherwise.
 */
export async function assertGroupInMosque(
  request: Request,
  groupId: string,
  expectedMosqueId: string,
): Promise<boolean> {
  const supabase = createSupabaseForUser(request);
  const { data } = await supabase
    .from("groups")
    .select("mosque_id")
    .eq("id", groupId)
    .maybeSingle();
  return Boolean(data && data.mosque_id === expectedMosqueId);
}
