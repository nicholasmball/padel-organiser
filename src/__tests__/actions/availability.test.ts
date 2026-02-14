import { describe, it, expect, vi, beforeEach } from "vitest";

const mockServerClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockServerClient)),
}));
vi.mock("@/lib/ensure-profile", () => ({
  ensureProfile: vi.fn().mockResolvedValue({}),
}));

import {
  addAvailability,
  removeAvailability,
  addUnavailableDate,
  removeUnavailableDate,
} from "@/lib/actions/availability";

function chainMock(result: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue(result);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addAvailability", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await addAvailability(1, "18:00", "20:00");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("inserts availability for authenticated user", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await addAvailability(2, "09:00", "12:00");
    expect(result).toEqual({ success: true });
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      day_of_week: 2,
      start_time: "09:00",
      end_time: "12:00",
    });
  });

  it("returns error on insert failure", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const chain = chainMock({ data: null, error: { message: "DB error" } });
    mockServerClient.from.mockReturnValue(chain);

    const result = await addAvailability(1, "18:00", "20:00");
    expect(result).toEqual({ error: "DB error" });
  });
});

describe("removeAvailability", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await removeAvailability("avail-1");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("deletes availability scoped to user", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await removeAvailability("avail-1");
    expect(result).toEqual({ success: true });
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "avail-1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});

describe("addUnavailableDate", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await addUnavailableDate("2026-03-15");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("inserts unavailable date with reason", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await addUnavailableDate("2026-03-15", "Holiday");
    expect(result).toEqual({ success: true });
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      date: "2026-03-15",
      reason: "Holiday",
    });
  });

  it("inserts unavailable date with null reason when not provided", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await addUnavailableDate("2026-03-15");
    expect(result).toEqual({ success: true });
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      date: "2026-03-15",
      reason: null,
    });
  });
});

describe("removeUnavailableDate", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await removeUnavailableDate("date-1");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("deletes unavailable date scoped to user", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await removeUnavailableDate("date-1");
    expect(result).toEqual({ success: true });
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "date-1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});
