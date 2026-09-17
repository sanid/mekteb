import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These guards gate all 122 `/api/**` route handlers, so a regression here is
 * a cross-tenant read or an auth bypass rather than a broken screen. The
 * suite locks the contract the routes rely on: no bearer token means no
 * access, `must_rotate_password` is refused everywhere, each role guard
 * insists on its own active membership, students reach member routes through
 * their profile instead of a membership row, and one request's resolved
 * identity never leaks into another.
 */

type Filters = { method: string; args: unknown[] }[];
/** Resolves a query to its result, given the table and the filters applied. */
type Resolver = (table: string, filters: Filters) => { data: unknown };

const state = vi.hoisted(() => ({
  user: null as { id: string; email?: string } | null,
  resolve: (() => ({ data: null })) as Resolver,
}));

function chainFor(table: string) {
  const filters: Filters = [];
  const settle = () => Promise.resolve(state.resolve(table, filters));
  const record = (method: string) => (...args: unknown[]) => {
    filters.push({ method, args });
    return chain;
  };
  const chain: Record<string, unknown> = {
    select: record("select"),
    eq: record("eq"),
    in: record("in"),
    is: record("is"),
    order: record("order"),
    limit: (...args: unknown[]) => {
      filters.push({ method: "limit", args });
      return settle();
    },
    maybeSingle: () => settle(),
    single: () => settle(),
    then: (onF: unknown, onR: unknown) => settle().then(onF as never, onR as never),
  };
  return chain;
}

const client = vi.hoisted(() => ({
  from: vi.fn(),
  auth: { getUser: vi.fn() },
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: () => client }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => client }));

import {
  assertGroupInMosque,
  requireApiAdmin,
  requireApiMember,
  requireApiTeacher,
  requireApiUser,
  resolveApiRole,
} from "./api-auth";

const MOSQUE = "mosque-1";
const OTHER_MOSQUE = "mosque-2";

/** A request carrying a bearer token, as the mobile clients send. */
const authed = (token = "valid-token") =>
  new Request("https://mekteb.de/api/v1/anything", {
    headers: { authorization: `Bearer ${token}` },
  });

/** Build a resolver from a table → result map, with filter-aware overrides. */
function resolver(map: Record<string, unknown>, byFilter?: Resolver): Resolver {
  return (table, filters) => {
    const override = byFilter?.(table, filters);
    if (override && override.data !== undefined) return override;
    return { data: map[table] ?? null };
  };
}

/** Reads the value passed to `.eq(field, …)` / `.in(field, …)`. */
const filterValue = (filters: Filters, field: string) =>
  filters.find((f) => (f.method === "eq" || f.method === "in") && f.args[0] === field)?.args[1];

beforeEach(() => {
  vi.clearAllMocks();
  client.from.mockImplementation((table: string) => chainFor(table));
  client.auth.getUser.mockImplementation(async () => ({ data: { user: state.user } }));
  state.user = { id: "user-1", email: "someone@example.org" };
  state.resolve = () => ({ data: null });
});

describe("token handling", () => {
  it("refuses a request with no Authorization header", async () => {
    state.resolve = resolver({ profiles: { must_rotate_password: false } });
    const bare = new Request("https://mekteb.de/api/v1/anything");
    expect(await requireApiUser(bare)).toBeNull();
  });

  it("refuses when the token resolves to no user", async () => {
    state.user = null;
    expect(await requireApiUser(authed())).toBeNull();
  });

  it("admits an authenticated user", async () => {
    state.resolve = resolver({ profiles: { must_rotate_password: false } });
    const ctx = await requireApiUser(authed());
    expect(ctx?.userId).toBe("user-1");
  });
});

// The documented contract: a user who has not rotated their temporary
// password is rejected by every strict guard until they do.
describe("must_rotate_password", () => {
  it("is refused by requireApiUser", async () => {
    state.resolve = resolver({ profiles: { must_rotate_password: true } });
    expect(await requireApiUser(authed())).toBeNull();
  });

  it("is refused by requireApiAdmin even with an admin membership", async () => {
    state.resolve = resolver({
      profiles: { must_rotate_password: true },
      memberships: [{ mosque_id: MOSQUE, mosques: { name: "Test" } }],
    });
    expect(await requireApiAdmin(authed())).toBeNull();
  });

  it("is refused by requireApiMember", async () => {
    state.resolve = resolver({
      profiles: { must_rotate_password: true },
      memberships: [{ mosque_id: MOSQUE }],
    });
    expect(await requireApiMember(authed())).toBeNull();
  });
});

describe("requireApiAdmin", () => {
  it("returns the mosque for an active mosque_admin", async () => {
    state.resolve = resolver({
      profiles: { must_rotate_password: false },
      memberships: [{ mosque_id: MOSQUE, mosques: { name: "Test Mosque" } }],
    });
    const ctx = await requireApiAdmin(authed());
    expect(ctx).toMatchObject({ mosqueId: MOSQUE, mosqueName: "Test Mosque" });
  });

  it("queries only active mosque_admin memberships", async () => {
    const seen: Filters[] = [];
    state.resolve = resolver(
      { profiles: { must_rotate_password: false }, memberships: [{ mosque_id: MOSQUE }] },
      (table, filters) => {
        if (table === "memberships") seen.push(filters);
        return { data: undefined as never };
      },
    );
    await requireApiAdmin(authed());
    expect(filterValue(seen[0], "role")).toBe("mosque_admin");
    expect(filterValue(seen[0], "is_active")).toBe(true);
  });

  it("returns null when the user holds no admin membership", async () => {
    state.resolve = resolver({ profiles: { must_rotate_password: false }, memberships: [] });
    expect(await requireApiAdmin(authed())).toBeNull();
  });
});

describe("requireApiTeacher", () => {
  it("accepts an assistant membership — assistants behave like teachers", async () => {
    const seen: Filters[] = [];
    state.resolve = resolver(
      {
        profiles: { must_rotate_password: false },
        memberships: [{ mosque_id: MOSQUE, mosques: { name: "Test" } }],
        teacher_profiles: { id: "tp-1" },
      },
      (table, filters) => {
        if (table === "memberships") seen.push(filters);
        return { data: undefined as never };
      },
    );
    const ctx = await requireApiTeacher(authed());
    expect(ctx?.teacherProfileId).toBe("tp-1");
    expect(filterValue(seen[0], "role")).toEqual(["teacher", "assistant"]);
  });

  it("refuses a membership with no active teacher_profiles row", async () => {
    state.resolve = resolver({
      profiles: { must_rotate_password: false },
      memberships: [{ mosque_id: MOSQUE, mosques: { name: "Test" } }],
      teacher_profiles: null,
    });
    expect(await requireApiTeacher(authed())).toBeNull();
  });
});

// Students deliberately hold no memberships row (standing invariant), so the
// member guard has to reach them through student_profiles or every
// student-facing route 401s.
describe("requireApiMember", () => {
  it("uses the membership mosque when one exists", async () => {
    state.resolve = resolver({
      profiles: { must_rotate_password: false },
      memberships: [{ mosque_id: MOSQUE }],
    });
    expect((await requireApiMember(authed()))?.mosqueId).toBe(MOSQUE);
  });

  it("falls back to the student profile when there is no membership", async () => {
    state.resolve = resolver({
      profiles: { must_rotate_password: false },
      memberships: [],
      student_profiles: {
        id: "sp-1",
        mosque_id: MOSQUE,
        full_name: "Amina",
        mosques: { name: "Test" },
      },
    });
    expect((await requireApiMember(authed()))?.mosqueId).toBe(MOSQUE);
  });

  it("returns null for a user who is neither member nor student", async () => {
    state.resolve = resolver({
      profiles: { must_rotate_password: false },
      memberships: [],
      student_profiles: null,
    });
    expect(await requireApiMember(authed())).toBeNull();
  });
});

describe("resolveApiRole", () => {
  it("prefers mosque_admin over every other role", async () => {
    state.resolve = resolver({
      profiles: { must_rotate_password: false },
      memberships: [{ mosque_id: MOSQUE, mosques: { name: "Test" } }],
      teacher_profiles: { id: "tp-1" },
    });
    expect(await resolveApiRole("user-1", authed())).toBe("mosque_admin");
  });

  it("reports 'none' when nothing matches", async () => {
    state.resolve = resolver({
      profiles: { must_rotate_password: false },
      memberships: [],
      teacher_profiles: null,
      examiner_profiles: null,
      parent_profiles: null,
      student_profiles: null,
    });
    expect(await resolveApiRole("user-1", authed())).toBe("none");
  });
});

// The cross-tenant guard: denormalised mosque_id is only safe if callers
// actually check the resource belongs to the actor's mosque.
describe("assertGroupInMosque", () => {
  it("accepts a group in the actor's mosque", async () => {
    state.resolve = resolver({ groups: { mosque_id: MOSQUE } });
    expect(await assertGroupInMosque(authed(), "group-1", MOSQUE)).toBe(true);
  });

  it("rejects a group belonging to another mosque", async () => {
    state.resolve = resolver({ groups: { mosque_id: OTHER_MOSQUE } });
    expect(await assertGroupInMosque(authed(), "group-1", MOSQUE)).toBe(false);
  });

  it("rejects a group that does not exist", async () => {
    state.resolve = resolver({ groups: null });
    expect(await assertGroupInMosque(authed(), "missing", MOSQUE)).toBe(false);
  });
});

// Contexts are cached per Request in a WeakMap. If that key were ever shared,
// one caller's mosque would answer another caller's request.
describe("per-request caching", () => {
  it("does not leak a resolved context between two requests", async () => {
    state.resolve = resolver({
      profiles: { must_rotate_password: false },
      memberships: [{ mosque_id: MOSQUE, mosques: { name: "First" } }],
    });
    const first = await requireApiAdmin(authed("token-a"));
    expect(first?.mosqueId).toBe(MOSQUE);

    state.resolve = resolver({
      profiles: { must_rotate_password: false },
      memberships: [{ mosque_id: OTHER_MOSQUE, mosques: { name: "Second" } }],
    });
    const second = await requireApiAdmin(authed("token-b"));
    expect(second?.mosqueId).toBe(OTHER_MOSQUE);
  });

  it("reuses the cached lookup within a single request", async () => {
    state.resolve = resolver({
      profiles: { must_rotate_password: false },
      memberships: [{ mosque_id: MOSQUE, mosques: { name: "Test" } }],
    });
    const request = authed();
    await requireApiAdmin(request);
    const callsAfterFirst = client.from.mock.calls.length;
    await requireApiAdmin(request);
    expect(client.from.mock.calls.length).toBe(callsAfterFirst);
  });
});
