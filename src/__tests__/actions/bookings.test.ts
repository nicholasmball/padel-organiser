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
  getAvailableMembers,
  addPlayerToBooking,
  getSavedVenues,
} from "@/lib/actions/bookings";

function chainMock(result: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
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

  it("returns error for past date", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    const result = await createBooking({ ...sampleBookingForm, date: "2020-01-01" });
    expect(result).toEqual({ error: "Cannot create a booking in the past" });
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

  it("notifies users whose availability matches the booking", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "organiser-1" } },
    });

    const insertChain = chainMock({ data: { id: "booking-1" }, error: null });
    const signupChain = chainMock({ data: null, error: null });
    let serverCallCount = 0;
    mockServerClient.from.mockImplementation(() => {
      serverCallCount++;
      if (serverCallCount === 1) return insertChain;
      return signupChain;
    });

    // Admin client calls from notifyAvailableUsers
    const availChain = chainMock({
      data: [
        { user_id: "player-1", start_time: "17:00", end_time: "20:00" },
        { user_id: "player-2", start_time: "10:00", end_time: "12:00" }, // no overlap
        { user_id: "organiser-1", start_time: "17:00", end_time: "20:00" }, // excluded (organiser)
      ],
      error: null,
    });
    const unavailChain = chainMock({ data: [], error: null });
    let adminCallCount = 0;
    mockAdminClient.from.mockImplementation(() => {
      adminCallCount++;
      if (adminCallCount === 1) return availChain; // availability query
      return unavailChain; // unavailable_dates query
    });

    await createBooking(sampleBookingForm);

    // Wait for async notification to complete
    await new Promise((r) => setTimeout(r, 50));

    const { createNotification } = await import("@/lib/actions/notifications");
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ["player-1"],
        type: "availability_match",
        title: "New game when you're free!",
      })
    );
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

  it("returns error for past date", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "organiser-1" } },
    });
    const result = await updateBooking("booking-1", { ...sampleBookingForm, date: "2020-01-01" });
    expect(result).toEqual({ error: "Cannot set booking date to the past" });
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

    const { createNotification } = await import("@/lib/actions/notifications");
    expect(createNotification).toHaveBeenCalledWith({
      userIds: ["player-1", "player-2"],
      bookingId: "booking-1",
      type: "cancelled",
      title: "Booking cancelled",
      message: "Padel Club has been cancelled by the organiser",
    });
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

  it("notifies organiser when a player signs up", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "player-1" } },
    });

    let callCount = 0;
    mockServerClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // booking details
        return chainMock({
          data: {
            max_players: 4,
            status: "open",
            organiser_id: "organiser-1",
            venue_name: "Padel Club",
          },
          error: null,
        });
      }
      if (callCount === 2) {
        // count confirmed
        return chainMock({ count: 1, data: null, error: null });
      }
      if (callCount === 3) {
        // insert signup
        return chainMock({ data: null, error: null });
      }
      if (callCount === 4) {
        // profile name lookup
        return chainMock({ data: { full_name: "John" }, error: null });
      }
      return chainMock({ data: null, error: null });
    });

    const result = await signUpForBooking("booking-1");
    expect(result).toEqual({ status: "confirmed" });

    const { createNotification } = await import("@/lib/actions/notifications");
    expect(createNotification).toHaveBeenCalledWith({
      userIds: ["organiser-1"],
      bookingId: "booking-1",
      type: "signup",
      title: "John signed up",
      message: "John signed up for Padel Club",
    });
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

describe("getAvailableMembers", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await getAvailableMembers("booking-1");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns members not already signed up", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // Signups query
    const signupsChain = chainMock({
      data: [{ user_id: "user-1" }, { user_id: "user-2" }],
      error: null,
    });
    mockServerClient.from.mockReturnValue(signupsChain);

    // All profiles via admin client
    const profilesChain = chainMock({
      data: [
        { id: "user-1", full_name: "Alice", skill_level: "beginner" },
        { id: "user-2", full_name: "Bob", skill_level: "intermediate" },
        { id: "user-3", full_name: "Charlie", skill_level: "advanced" },
      ],
      error: null,
    });
    mockAdminClient.from.mockReturnValue(profilesChain);

    const result = await getAvailableMembers("booking-1");
    expect(result.members).toHaveLength(1);
    expect(result.members![0].id).toBe("user-3");
    expect(result.members![0].full_name).toBe("Charlie");
  });
});

describe("addPlayerToBooking", () => {
  it("returns error when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await addPlayerToBooking("booking-1", "player-1");
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when user is not the organiser", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({
      data: { organiser_id: "organiser-1", max_players: 4, status: "open", venue_name: "Club" },
      error: null,
    });
    mockServerClient.from.mockReturnValue(chain);

    const result = await addPlayerToBooking("booking-1", "player-1");
    expect(result).toEqual({ error: "Only the organiser can add players" });
  });

  it("returns error for cancelled booking", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "organiser-1" } },
    });

    const chain = chainMock({
      data: { organiser_id: "organiser-1", max_players: 4, status: "cancelled", venue_name: "Club" },
      error: null,
    });
    mockServerClient.from.mockReturnValue(chain);

    const result = await addPlayerToBooking("booking-1", "player-1");
    expect(result).toEqual({ error: "Booking is cancelled" });
  });

  it("adds player as confirmed when spots available", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "organiser-1" } },
    });

    const bookingChain = chainMock({
      data: { organiser_id: "organiser-1", max_players: 4, status: "open", venue_name: "Club" },
      error: null,
    });

    let serverCallCount = 0;
    mockServerClient.from.mockImplementation(() => {
      serverCallCount++;
      if (serverCallCount === 1) return bookingChain; // booking lookup
      // organiser profile lookup
      return chainMock({ data: { full_name: "Organiser" }, error: null });
    });

    const countChain = chainMock({ count: 2, data: null, error: null });
    const insertChain = chainMock({ data: null, error: null });
    let adminCallCount = 0;
    mockAdminClient.from.mockImplementation(() => {
      adminCallCount++;
      if (adminCallCount === 1) return countChain; // count confirmed
      return insertChain; // insert signup
    });

    const result = await addPlayerToBooking("booking-1", "player-1");
    expect(result).toEqual({ success: true, status: "confirmed" });
  });

  it("returns error for duplicate player", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "organiser-1" } },
    });

    const bookingChain = chainMock({
      data: { organiser_id: "organiser-1", max_players: 4, status: "open", venue_name: "Club" },
      error: null,
    });
    mockServerClient.from.mockReturnValue(bookingChain);

    const countChain = chainMock({ count: 2, data: null, error: null });
    const insertChain = chainMock({ data: null, error: null });
    // Override insert to return duplicate error
    insertChain.insert = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate" },
    });

    let adminCallCount = 0;
    mockAdminClient.from.mockImplementation(() => {
      adminCallCount++;
      if (adminCallCount === 1) return countChain;
      return insertChain;
    });

    const result = await addPlayerToBooking("booking-1", "player-1");
    expect(result).toEqual({ error: "Player is already signed up" });
  });
});

describe("getSavedVenues", () => {
  it("returns empty array when not authenticated", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await getSavedVenues();
    expect(result).toEqual({ venues: [] });
  });

  it("returns deduplicated venues from bookings", async () => {
    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = chainMock({
      data: [
        { venue_name: "Club A", venue_address: "123 St", court_number: "1", is_outdoor: true },
        { venue_name: "Club A", venue_address: "123 St", court_number: "2", is_outdoor: true },
        { venue_name: "Club B", venue_address: "456 Rd", court_number: null, is_outdoor: false },
      ],
      error: null,
    });
    mockAdminClient.from.mockReturnValue(chain);

    const result = await getSavedVenues();
    expect(result.venues).toHaveLength(2);
    expect(result.venues[0].venue_name).toBe("Club A");
    expect(result.venues[1].venue_name).toBe("Club B");
  });
});
