import { describe, it, expect, vi, beforeEach } from "vitest";

const mockServerClient = {
  auth: { getUser: vi.fn() },
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
vi.mock("@/lib/actions/notifications", () => ({
  createNotification: vi.fn(),
}));

import {
  addComment,
  updateComment,
  deleteComment,
  togglePinComment,
} from "@/lib/actions/comments";

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

describe("addComment", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await addComment("booking-1", "Hello");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error for empty comment", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const result = await addComment("booking-1", "   ");
    expect(result).toEqual({ error: "Comment cannot be empty" });
  });

  it("creates comment and returns success", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await addComment("booking-1", "Great game!");
    expect(result).toEqual({ success: true });
    expect(chain.insert).toHaveBeenCalledWith({
      booking_id: "booking-1",
      user_id: "user-1",
      content: "Great game!",
    });
  });

  it("notifies other signed-up players about the comment", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "commenter-1" } },
    });

    let callCount = 0;
    mockServerClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // insert comment
        return chainMock({ data: null, error: null });
      }
      if (callCount === 2) {
        // signups query
        return chainMock({
          data: [{ user_id: "player-1" }, { user_id: "player-2" }],
          error: null,
        });
      }
      if (callCount === 3) {
        // profile query (commenter name)
        return chainMock({ data: { full_name: "Alice" }, error: null });
      }
      // bookings query (venue name)
      return chainMock({ data: { venue_name: "Padel Club" }, error: null });
    });

    await addComment("booking-1", "See you there!");

    const { createNotification } = await import("@/lib/actions/notifications");
    expect(createNotification).toHaveBeenCalledWith({
      userIds: ["player-1", "player-2"],
      bookingId: "booking-1",
      type: "comment",
      title: "Alice commented",
      message: 'New comment on Padel Club: "See you there!"',
    });
  });

  it("trims whitespace from comment content", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    await addComment("booking-1", "  Hello world  ");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Hello world" })
    );
  });
});

describe("updateComment", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await updateComment("comment-1", "booking-1", "Updated");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error for empty content", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const result = await updateComment("comment-1", "booking-1", "  ");
    expect(result).toEqual({ error: "Comment cannot be empty" });
  });

  it("updates comment scoped to user", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await updateComment("comment-1", "booking-1", "Updated text");
    expect(result).toEqual({ success: true });
    expect(chain.update).toHaveBeenCalledWith({ content: "Updated text" });
    expect(chain.eq).toHaveBeenCalledWith("id", "comment-1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});

describe("deleteComment", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await deleteComment("comment-1", "booking-1");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("deletes comment scoped to user", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await deleteComment("comment-1", "booking-1");
    expect(result).toEqual({ success: true });
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "comment-1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});

describe("togglePinComment", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await togglePinComment("comment-1", "booking-1", true);
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when booking not found", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await togglePinComment("comment-1", "booking-1", true);
    expect(result).toEqual({ error: "Booking not found" });
  });

  it("returns error when user is not the organiser", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({
      data: { organiser_id: "organiser-1" },
      error: null,
    });
    mockServerClient.from.mockReturnValue(chain);

    const result = await togglePinComment("comment-1", "booking-1", true);
    expect(result).toEqual({ error: "Only the organiser can pin comments" });
  });

  it("pins comment via admin client when user is organiser", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "organiser-1" } },
    });

    const serverChain = chainMock({
      data: { organiser_id: "organiser-1" },
      error: null,
    });
    mockServerClient.from.mockReturnValue(serverChain);

    const adminChain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(adminChain);

    const result = await togglePinComment("comment-1", "booking-1", true);
    expect(result).toEqual({ success: true });
    expect(mockAdminClient.from).toHaveBeenCalledWith("comments");
    expect(adminChain.update).toHaveBeenCalledWith({ is_pinned: true });
  });
});
