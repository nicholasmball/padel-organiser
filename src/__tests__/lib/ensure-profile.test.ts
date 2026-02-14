import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureProfile } from "@/lib/ensure-profile";

function createMockSupabase(overrides: {
  user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null;
  profileExists?: boolean;
  insertError?: { code: string; message: string } | null;
}) {
  const user = overrides.user ?? null;
  const selectMock = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: overrides.profileExists ? { id: user?.id } : null,
      error: null,
    }),
  };
  const insertMock = vi.fn().mockResolvedValue({
    error: overrides.insertError ?? null,
  });

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue(selectMock),
          insert: insertMock,
        };
      }
      return {};
    }),
  };

  return { client, insertMock };
}

describe("ensureProfile", () => {
  it("returns error when not authenticated", async () => {
    const { client } = createMockSupabase({ user: null });
    const result = await ensureProfile(client as never);
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("does nothing when profile already exists", async () => {
    const { client, insertMock } = createMockSupabase({
      user: { id: "user-1", email: "test@test.com" },
      profileExists: true,
    });

    const result = await ensureProfile(client as never);
    expect(result).toEqual({});
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates profile with full_name from user_metadata", async () => {
    const { client, insertMock } = createMockSupabase({
      user: {
        id: "user-1",
        email: "test@test.com",
        user_metadata: { full_name: "John Smith" },
      },
      profileExists: false,
    });

    const result = await ensureProfile(client as never);
    expect(result).toEqual({});
    expect(insertMock).toHaveBeenCalledWith({
      id: "user-1",
      full_name: "John Smith",
      email: "test@test.com",
    });
  });

  it("falls back to email prefix when no full_name in metadata", async () => {
    const { client, insertMock } = createMockSupabase({
      user: { id: "user-1", email: "jane.doe@example.com" },
      profileExists: false,
    });

    const result = await ensureProfile(client as never);
    expect(result).toEqual({});
    expect(insertMock).toHaveBeenCalledWith({
      id: "user-1",
      full_name: "jane.doe",
      email: "jane.doe@example.com",
    });
  });

  it("ignores duplicate key error (23505)", async () => {
    const { client } = createMockSupabase({
      user: { id: "user-1", email: "test@test.com" },
      profileExists: false,
      insertError: { code: "23505", message: "duplicate key" },
    });

    const result = await ensureProfile(client as never);
    expect(result).toEqual({});
  });

  it("returns error for non-duplicate insert errors", async () => {
    const { client } = createMockSupabase({
      user: { id: "user-1", email: "test@test.com" },
      profileExists: false,
      insertError: { code: "42501", message: "permission denied" },
    });

    const result = await ensureProfile(client as never);
    expect(result).toEqual({ error: "permission denied" });
  });
});
