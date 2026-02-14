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

import { togglePaymentStatus } from "@/lib/actions/payments";

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

describe("togglePaymentStatus", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await togglePaymentStatus("signup-1", "booking-1");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when signup not found", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await togglePaymentStatus("signup-1", "booking-1");
    expect(result).toEqual({ error: "Signup not found" });
  });

  it("toggles unpaid to paid for the player themselves", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "player-1" } },
    });

    let callCount = 0;
    mockServerClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // signups query
        return chainMock({
          data: { payment_status: "unpaid", user_id: "player-1", booking_id: "booking-1" },
          error: null,
        });
      }
      // bookings query
      return chainMock({
        data: { organiser_id: "organiser-1" },
        error: null,
      });
    });

    const adminChain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(adminChain);

    const result = await togglePaymentStatus("signup-1", "booking-1");
    expect(result).toEqual({ status: "paid" });
  });

  it("toggles paid to unpaid", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "player-1" } },
    });

    let callCount = 0;
    mockServerClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainMock({
          data: { payment_status: "paid", user_id: "player-1", booking_id: "booking-1" },
          error: null,
        });
      }
      return chainMock({
        data: { organiser_id: "organiser-1" },
        error: null,
      });
    });

    const adminChain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(adminChain);

    const result = await togglePaymentStatus("signup-1", "booking-1");
    expect(result).toEqual({ status: "unpaid" });
  });

  it("allows organiser to toggle another player's payment", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "organiser-1" } },
    });

    let callCount = 0;
    mockServerClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainMock({
          data: { payment_status: "unpaid", user_id: "player-1", booking_id: "booking-1" },
          error: null,
        });
      }
      return chainMock({
        data: { organiser_id: "organiser-1" },
        error: null,
      });
    });

    const adminChain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(adminChain);

    const result = await togglePaymentStatus("signup-1", "booking-1");
    expect(result).toEqual({ status: "paid" });
  });

  it("returns error when user is neither player nor organiser", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "random-user" } },
    });

    let callCount = 0;
    mockServerClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainMock({
          data: { payment_status: "unpaid", user_id: "player-1", booking_id: "booking-1" },
          error: null,
        });
      }
      return chainMock({
        data: { organiser_id: "organiser-1" },
        error: null,
      });
    });

    const result = await togglePaymentStatus("signup-1", "booking-1");
    expect(result).toEqual({ error: "Not authorized" });
  });
});
