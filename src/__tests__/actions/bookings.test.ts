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
vi.mock("@/lib/ensure-profile", () => ({
  ensureProfile: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/geocode", () => ({
  geocodeAddress: vi.fn().mockResolvedValue({ lat: 51.5, lng: -0.1 }),
}));
vi.mock("@/lib/actions/notifications", () => ({
  createNotification: vi.fn(),
}));

import {
  createBooking,
  updateBooking,
  deleteBooking,
  signUpForBooking,
  markInterested,
  leaveBooking,
} from "@/lib/actions/bookings";

function chainMock(result: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
  return chain;
}

const sampleBookingForm = {
  venue_name: "Padel Club",
  venue_address: "123 Main St, SW1A 1AA",
  court_number: "Court 1",
  is_outdoor: true,
  date: "2026-03-15",
  start_time: "18:00",
  end_time: "19:30",
  total_cost: 40,
  max_players: 4,
  notes: "Bring water",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createBooking", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await createBooking(sampleBookingForm);
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("creates booking with geocoded coordinates and auto-signs up organiser", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "organiser-1" } },
    });

    const insertChain = chainMock({ data: { id: "booking-1" }, error: null });
    const signupChain = chainMock({ data: null, error: null });
    let callCount = 0;
    mockServerClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return insertChain; // bookings insert
      return signupChain; // signups insert
    });

    const result = await createBooking(sampleBookingForm);
    expect(result).toEqual({ id: "booking-1" });

    // Verify booking insert includes geocoded coords
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        venue_lat: 51.5,
        venue_lng: -0.1,
        organiser_id: "organiser-1",
      })
    );

    // Verify organiser auto-signup
    expect(signupChain.insert).toHaveBeenCalledWith({
      booking_id: "booking-1",
      user_id: "organiser-1",
      status: "confirmed",
    });
  });

  it("returns error on insert failure", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "organiser-1" } },
    });

    const chain = chainMock({
      data: null,
      error: { message: "Insert failed" },
    });
    mockServerClient.from.mockReturnValue(chain);

    const result = await createBooking(sampleBookingForm);
    expect(result).toEqual({ error: "Insert failed" });
  });
});

describe("updateBooking", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await updateBooking("booking-1", sampleBookingForm);
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("updates booking with new geocoded address", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "organiser-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await updateBooking("booking-1", sampleBookingForm);
    expect(result).toEqual({ success: true });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        venue_lat: 51.5,
        venue_lng: -0.1,
      })
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "booking-1");
  });
});

describe("deleteBooking", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await deleteBooking("booking-1");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("cancels booking and notifies signed-up players", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "organiser-1" } },
    });

    let callCount = 0;
    mockServerClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // bookings select (venue_name)
        return chainMock({ data: { venue_name: "Padel Club" }, error: null });
      }
      if (callCount === 2) {
        // signups select
        return chainMock({
          data: [{ user_id: "player-1" }, { user_id: "player-2" }],
          error: null,
        });
      }
      // bookings update (status → cancelled)
      return chainMock({ data: null, error: null });
    });

    const result = await deleteBooking("booking-1");
    expect(result).toEqual({ success: true });
  });
});

describe("signUpForBooking", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await signUpForBooking("booking-1");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when booking not found", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await signUpForBooking("booking-1");
    expect(result).toEqual({ error: "Booking not found" });
  });

  it("returns error for cancelled booking", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    let callCount = 0;
    mockServerClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainMock({
          data: {
            max_players: 4,
            status: "cancelled",
            organiser_id: "org-1",
            venue_name: "Club",
          },
          error: null,
        });
      }
      return chainMock({ data: null, error: null });
    });

    const result = await signUpForBooking("booking-1");
    expect(result).toEqual({ error: "Booking is cancelled" });
  });

  it("returns 'Already signed up' for duplicate signup", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    let callCount = 0;
    mockServerClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainMock({
          data: {
            max_players: 4,
            status: "open",
            organiser_id: "org-1",
            venue_name: "Club",
          },
          error: null,
        });
      }
      if (callCount === 2) {
        // count query
        return chainMock({ count: 2, data: null, error: null });
      }
      // insert with duplicate key error
      return chainMock({
        data: null,
        error: { code: "23505", message: "duplicate" },
      });
    });

    const result = await signUpForBooking("booking-1");
    expect(result).toEqual({ error: "Already signed up" });
  });
});

describe("markInterested", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await markInterested("booking-1");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("creates interested signup", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({ data: null, error: null });
    mockServerClient.from.mockReturnValue(chain);

    const result = await markInterested("booking-1");
    expect(result).toEqual({ success: true });
    expect(chain.insert).toHaveBeenCalledWith({
      booking_id: "booking-1",
      user_id: "user-1",
      status: "interested",
    });
  });
});

describe("leaveBooking", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await leaveBooking("booking-1");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("deletes signup for the user", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    let callCount = 0;
    mockServerClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Check signup status
        return chainMock({ data: { status: "interested" }, error: null });
      }
      // Delete signup
      return chainMock({ data: null, error: null });
    });

    const result = await leaveBooking("booking-1");
    expect(result).toEqual({ success: true });
  });

  it("promotes waitlist player when confirmed player leaves", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "confirmed-user" } },
    });

    let serverCallCount = 0;
    mockServerClient.from.mockImplementation(() => {
      serverCallCount++;
      if (serverCallCount === 1) {
        // Check signup status — was confirmed
        return chainMock({ data: { status: "confirmed" }, error: null });
      }
      // Delete signup
      return chainMock({ data: null, error: null });
    });

    // Admin client handles waitlist promotion
    let adminCallCount = 0;
    mockAdminClient.from.mockImplementation(() => {
      adminCallCount++;
      if (adminCallCount === 1) {
        // Find next in waitlist
        return chainMock({
          data: { id: "signup-2", user_id: "waitlist-user" },
          error: null,
        });
      }
      if (adminCallCount === 2) {
        // Update signup to confirmed
        return chainMock({ data: null, error: null });
      }
      if (adminCallCount === 3) {
        // Get booking name for notification
        return chainMock({ data: { venue_name: "Padel Club" }, error: null });
      }
      if (adminCallCount === 4) {
        // Count confirmed signups
        return chainMock({ count: 3, data: null, error: null });
      }
      if (adminCallCount === 5) {
        // Get max_players
        return chainMock({ data: { max_players: 4 }, error: null });
      }
      // Update booking status
      return chainMock({ data: null, error: null });
    });

    const result = await leaveBooking("booking-1");
    expect(result).toEqual({ success: true });
    expect(mockAdminClient.from).toHaveBeenCalled();
  });
});
