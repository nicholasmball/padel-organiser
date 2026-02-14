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

import { deleteAccount } from "@/lib/actions/account";

function chainMock(result: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteAccount", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await deleteAccount();
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("deletes notifications, profile, and auth user in order", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(chain);
    mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });

    const result = await deleteAccount();
    expect(result).toEqual({ success: true });

    // Verify order: notifications first, then profile
    const fromCalls = mockAdminClient.from.mock.calls;
    expect(fromCalls[0][0]).toBe("notifications");
    expect(fromCalls[1][0]).toBe("profiles");

    // Auth user deleted last
    expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("returns error when profile deletion fails", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: { message: "FK constraint" } });
    mockAdminClient.from.mockReturnValue(chain);

    const result = await deleteAccount();
    expect(result).toEqual({ error: "FK constraint" });
  });

  it("returns error when auth user deletion fails", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(chain);
    mockAdminClient.auth.admin.deleteUser.mockResolvedValue({
      error: { message: "Auth error" },
    });

    const result = await deleteAccount();
    expect(result).toEqual({ error: "Auth error" });
  });
});
