import { afterEach, describe, expect, it, vi } from "vitest";

import { createAdminClient } from "./supabase/admin";
import { checkStudentLimit } from "./student-limit";

vi.mock("./supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => `translated:${key}`),
}));

function mockAdmin(count: number, plan: { max_students: number | null } | null) {
  const from = vi.fn((table: string) => {
    if (table === "student_profiles") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count }),
        })),
      };
    }
    if (table === "mosque_subscriptions") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: plan ? { plans: plan } : null }),
          })),
        })),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from });
  return from;
}

describe("checkStudentLimit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the plan has no student limit (unlimited)", async () => {
    mockAdmin(50, { max_students: null });

    const result = await checkStudentLimit("mosque-1");

    expect(result).toBeNull();
  });

  it("returns null when there is no subscription row (treated as unlimited)", async () => {
    mockAdmin(50, null);

    const result = await checkStudentLimit("mosque-1");

    expect(result).toBeNull();
  });

  it("returns null when the student count is below the limit", async () => {
    mockAdmin(5, { max_students: 10 });

    const result = await checkStudentLimit("mosque-1");

    expect(result).toBeNull();
  });

  it("returns a translated error when the student count is at the limit", async () => {
    mockAdmin(10, { max_students: 10 });

    const result = await checkStudentLimit("mosque-1");

    expect(result).toBe("translated:studentLimitReached");
  });

  it("returns a translated error when the student count is over the limit", async () => {
    mockAdmin(11, { max_students: 10 });

    const result = await checkStudentLimit("mosque-1");

    expect(result).toBe("translated:studentLimitReached");
  });
});
