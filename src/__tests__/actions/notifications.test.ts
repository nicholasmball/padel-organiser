import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks must be set up before imports ---
const mockServerClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};
const mockAdminClient = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockServerClient)),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

import {
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
} from "@/lib/actions/notifications";

// Helper to set up chained query mock
function chainMock(result: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue(result);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUnreadCount", () => {
  it("returns 0 when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const count = await getUnreadCount();
    expect(count).toBe(0);
  });

  it("returns the unread notification count", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ count: 5, data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const count = await getUnreadCount();
    expect(count).toBe(5);
    expect(mockServerClient.from).toHaveBeenCalledWith("notifications");
  });

  it("returns 0 when count is null", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ count: null, data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const count = await getUnreadCount();
    expect(count).toBe(0);
  });
});

describe("markAsRead", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await markAsRead("notif-1");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("marks a notification as read", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await markAsRead("notif-1");
    expect(result).toEqual({ success: true });
    expect(chain.update).toHaveBeenCalledWith({ is_read: true });
  });
});

describe("markAllAsRead", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await markAllAsRead();
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("marks all unread notifications as read", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await markAllAsRead();
    expect(result).toEqual({ success: true });
    expect(chain.update).toHaveBeenCalledWith({ is_read: true });
  });
});

describe("createNotification", () => {
  it("does nothing when userIds is empty", async () => {
    await createNotification({
      userIds: [],
      bookingId: "b-1",
      type: "signup",
      title: "Test",
      message: "Test message",
    });

    expect(mockAdminClient.from).not.toHaveBeenCalled();
  });

  it("creates notifications for multiple users", async () => {
    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(chain);

    await createNotification({
      userIds: ["user-1", "user-2"],
      bookingId: "b-1",
      type: "signup",
      title: "New signup",
      message: "Someone signed up",
    });

    expect(mockAdminClient.from).toHaveBeenCalledWith("notifications");
    expect(chain.insert).toHaveBeenCalledWith([
      {
        user_id: "user-1",
        booking_id: "b-1",
        type: "signup",
        title: "New signup",
        message: "Someone signed up",
      },
      {
        user_id: "user-2",
        booking_id: "b-1",
        type: "signup",
        title: "New signup",
        message: "Someone signed up",
      },
    ]);
  });
});
