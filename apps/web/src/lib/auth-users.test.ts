import { describe, expect, it, vi } from "vitest";

import { findAuthUserByEmail } from "./auth-users";

type ListArgs = { page: number; perPage: number };

/** Stub matching the slice of the admin client the helper touches. */
function clientOf(pages: { email: string }[][]) {
  const listUsers = vi.fn(async ({ page }: ListArgs) => ({
    data: { users: pages[page - 1] ?? [] },
    error: null,
  }));
  return { client: { auth: { admin: { listUsers } } }, listUsers };
}

const page = (n: number, prefix = "u") =>
  Array.from({ length: n }, (_, i) => ({ email: `${prefix}${i}@example.org` }));

describe("findAuthUserByEmail", () => {
  it("finds a user on the first page", async () => {
    const { client } = clientOf([[{ email: "admin@example.org" }]]);
    const result = await findAuthUserByEmail(client as never, "admin@example.org");
    expect(result.user?.email).toBe("admin@example.org");
  });

  it("matches case-insensitively and ignores surrounding space", async () => {
    const { client } = clientOf([[{ email: "admin@example.org" }]]);
    const result = await findAuthUserByEmail(client as never, "  ADMIN@Example.ORG  ");
    expect(result.user?.email).toBe("admin@example.org");
  });

  // The regression this helper exists for: a single perPage:1000 call reported
  // "no such user" for everyone past the first page.
  it("keeps paging past the first full page", async () => {
    const { client, listUsers } = clientOf([page(1000), [{ email: "late@example.org" }]]);
    const result = await findAuthUserByEmail(client as never, "late@example.org");
    expect(result.user?.email).toBe("late@example.org");
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("stops on a short page and reports no account", async () => {
    const { client, listUsers } = clientOf([page(3)]);
    const result = await findAuthUserByEmail(client as never, "absent@example.org");
    expect(result.user).toBeNull();
    expect(result.error).toBeUndefined();
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it("distinguishes a lookup failure from a missing account", async () => {
    const client = {
      auth: { admin: { listUsers: vi.fn(async () => ({ data: null, error: { message: "boom" } })) } },
    };
    const result = await findAuthUserByEmail(client as never, "someone@example.org");
    expect(result.error).toBe("boom");
    expect(result.user).toBeUndefined();
  });
});
