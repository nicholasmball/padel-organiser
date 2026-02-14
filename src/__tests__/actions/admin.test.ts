import { describe, it, expect, vi, beforeEach } from "vitest";

const mockServerClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};
const mockAdminClient = {
  auth: {
    admin: { deleteUser: vi.fn() },
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockServerClient)),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

import {
  isEmailBlacklisted,
  checkIsAdmin,
  deleteUser,
  blacklistUser,
  removeFromBlacklist,
  addToBlacklist,
  toggleAdmin,
} from "@/lib/actions/admin";

function chainMock(result: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue(result);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
  return chain;
}

function setupAdminUser() {
  mockServerClient.auth.getUser.mockResolvedValue({
    data: { user: { id: "admin-1" } },
  });
  // requireAdmin checks profiles via admin client
  mockAdminClient.from.mockImplementation((table: string) => {
    if (table === "profiles") {
      return chainMock({ data: { is_admin: true }, error: null });
    }
    return chainMock({ data: null, error: null });
  });
}

function setupNonAdminUser() {
  mockServerClient.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
  mockAdminClient.from.mockImplementation((table: string) => {
    if (table === "profiles") {
      return chainMock({ data: { is_admin: false }, error: null });
    }
    return chainMock({ data: null, error: null });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isEmailBlacklisted", () => {
  it("returns true when email is in blacklist", async () => {
    const chain = chainMock({ data: { id: "bl-1" }, error: null });
    mockAdminClient.from.mockReturnValue(chain);

    const result = await isEmailBlacklisted("banned@test.com");
    expect(result).toBe(true);
    expect(chain.eq).toHaveBeenCalledWith("email", "banned@test.com");
  });

  it("returns false when email is not in blacklist", async () => {
    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(chain);

    const result = await isEmailBlacklisted("clean@test.com");
    expect(result).toBe(false);
  });

  it("normalizes email to lowercase", async () => {
    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(chain);

    await isEmailBlacklisted("UPPER@TEST.COM");
    expect(chain.eq).toHaveBeenCalledWith("email", "upper@test.com");
  });
});

describe("checkIsAdmin", () => {
  it("returns false when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await checkIsAdmin();
    expect(result).toBe(false);
  });

  it("returns true when user is admin", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
    });
    const chain = chainMock({ data: { is_admin: true }, error: null });
    mockAdminClient.from.mockReturnValue(chain);

    const result = await checkIsAdmin();
    expect(result).toBe(true);
  });

  it("returns false when user is not admin", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const chain = chainMock({ data: { is_admin: false }, error: null });
    mockAdminClient.from.mockReturnValue(chain);

    const result = await checkIsAdmin();
    expect(result).toBe(false);
  });
});

describe("deleteUser", () => {
  it("throws when not admin", async () => {
    setupNonAdminUser();
    await expect(deleteUser("target-1")).rejects.toThrow("Not an admin");
  });

  it("prevents self-deletion", async () => {
    setupAdminUser();
    const result = await deleteUser("admin-1");
    expect(result).toEqual({
      error: "Cannot delete your own account from admin panel",
    });
  });

  it("deletes notifications, profile, and auth user", async () => {
    setupAdminUser();

    // Override to track all from() calls after requireAdmin
    const calls: string[] = [];
    mockAdminClient.from.mockImplementation((table: string) => {
      calls.push(table);
      return chainMock({ data: { is_admin: true }, error: null });
    });
    mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });

    const result = await deleteUser("target-1");
    expect(result).toEqual({ success: true });

    // requireAdmin calls profiles, then delete sequence
    const deleteCalls = calls.filter((c) => c !== "profiles" || calls.indexOf(c) > 0);
    expect(calls).toContain("notifications");
    expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith("target-1");
  });
});

describe("addToBlacklist", () => {
  it("throws when not admin", async () => {
    setupNonAdminUser();
    await expect(addToBlacklist("test@test.com")).rejects.toThrow("Not an admin");
  });

  it("adds email to blacklist (normalised to lowercase)", async () => {
    setupAdminUser();

    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return chainMock({ data: { is_admin: true }, error: null });
      }
      return chain;
    });

    const result = await addToBlacklist("TEST@EXAMPLE.COM", "Spam");
    expect(result).toEqual({ success: true });
    expect(chain.insert).toHaveBeenCalledWith({
      email: "test@example.com",
      reason: "Spam",
      blacklisted_by: "admin-1",
    });
  });

  it("returns error for duplicate email", async () => {
    setupAdminUser();

    const chain = chainMock({ data: null, error: null });
    chain.insert.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate" },
    });

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return chainMock({ data: { is_admin: true }, error: null });
      }
      return chain;
    });

    const result = await addToBlacklist("existing@test.com");
    expect(result).toEqual({ error: "Email is already blacklisted" });
  });
});

describe("removeFromBlacklist", () => {
  it("throws when not admin", async () => {
    setupNonAdminUser();
    await expect(removeFromBlacklist("bl-1")).rejects.toThrow("Not an admin");
  });

  it("removes entry from blacklist", async () => {
    setupAdminUser();

    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return chainMock({ data: { is_admin: true }, error: null });
      }
      return chain;
    });

    const result = await removeFromBlacklist("bl-1");
    expect(result).toEqual({ success: true });
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "bl-1");
  });
});

describe("toggleAdmin", () => {
  it("throws when not admin", async () => {
    setupNonAdminUser();
    await expect(toggleAdmin("user-1", true)).rejects.toThrow("Not an admin");
  });

  it("prevents changing own admin status", async () => {
    setupAdminUser();
    const result = await toggleAdmin("admin-1", false);
    expect(result).toEqual({ error: "Cannot change your own admin status" });
  });

  it("toggles admin status for another user", async () => {
    setupAdminUser();

    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        // First call is requireAdmin, subsequent are the actual update
        return chainMock({ data: { is_admin: true }, error: null });
      }
      return chain;
    });

    const result = await toggleAdmin("user-2", true);
    expect(result).toEqual({ success: true });
  });
});
