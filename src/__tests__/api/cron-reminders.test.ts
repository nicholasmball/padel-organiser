import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAdminClient = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

import { GET } from "@/app/api/cron/reminders/route";

function chainMock(result: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue(result);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("GET /api/cron/reminders", () => {
  it("returns 401 when CRON_SECRET is set but auth header is wrong", async () => {
    process.env.CRON_SECRET = "my-secret";
    const req = new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when CRON_SECRET is set but no auth header", async () => {
    process.env.CRON_SECRET = "my-secret";
    const req = new Request("http://localhost/api/cron/reminders");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("allows access when CRON_SECRET matches", async () => {
    process.env.CRON_SECRET = "my-secret";

    // Return no bookings so it processes quickly
    const chain = chainMock({ data: [], error: null });
    mockAdminClient.from.mockReturnValue(chain);

    const req = new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "Bearer my-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("allows access when no CRON_SECRET is configured", async () => {
    const chain = chainMock({ data: [], error: null });
    mockAdminClient.from.mockReturnValue(chain);

    const req = new Request("http://localhost/api/cron/reminders");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
  });

  it("returns ok with zero sent when no matching bookings", async () => {
    const chain = chainMock({ data: [], error: null });
    mockAdminClient.from.mockReturnValue(chain);

    const req = new Request("http://localhost/api/cron/reminders");
    const res = await GET(req);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.reminders).toEqual([]);
  });

  it("skips bookings where reminder already sent", async () => {
    // For this test, we need to simulate:
    // 1. Bookings query returns a booking within the time window
    // 2. Existing notifications query returns that booking (already notified)
    // Result: no new notifications sent

    const now = new Date();
    // Create a booking that starts in ~23.5 hours (within the 24h window)
    const bookingTime = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
    const bookingDate = bookingTime.toISOString().split("T")[0];
    const bookingHour = bookingTime.getHours().toString().padStart(2, "0");
    const bookingMin = bookingTime.getMinutes().toString().padStart(2, "0");

    let callCount = 0;
    mockAdminClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Bookings query for 24h window
        return chainMock({
          data: [
            {
              id: "booking-1",
              venue_name: "Club",
              date: bookingDate,
              start_time: `${bookingHour}:${bookingMin}`,
            },
          ],
          error: null,
        });
      }
      if (callCount === 2) {
        // Existing notifications — already sent for this booking
        return chainMock({
          data: [{ booking_id: "booking-1" }],
          error: null,
        });
      }
      // Bookings query for 3h window — no bookings
      return chainMock({ data: [], error: null });
    });

    const req = new Request("http://localhost/api/cron/reminders");
    const res = await GET(req);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
  });

  it("continues when bookings query returns error", async () => {
    const chain = chainMock({ data: null, error: { message: "DB error" } });
    mockAdminClient.from.mockReturnValue(chain);

    const req = new Request("http://localhost/api/cron/reminders");
    const res = await GET(req);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
  });
});
