import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAdminClient = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

// Mock global fetch for Open-Meteo calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { GET } from "@/app/api/weather/route";

function chainMock(result: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockResolvedValue(result);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/weather", () => {
  it("returns 400 when lat is missing", async () => {
    const req = new Request("http://localhost/api/weather?lng=-0.1&date=2026-03-15");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing lat, lng, or date");
  });

  it("returns 400 when lng is missing", async () => {
    const req = new Request("http://localhost/api/weather?lat=51.5&date=2026-03-15");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when date is missing", async () => {
    const req = new Request("http://localhost/api/weather?lat=51.5&lng=-0.1");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns cached forecast if within TTL", async () => {
    const cachedForecast = {
      temperature_max: 20,
      temperature_min: 10,
      precipitation_probability: 30,
      wind_speed_max: 15,
      weather_code: 1,
    };

    const chain = chainMock({
      data: {
        forecast_data: cachedForecast,
        fetched_at: new Date().toISOString(), // fresh cache
      },
      error: null,
    });
    mockAdminClient.from.mockReturnValue(chain);

    const req = new Request(
      "http://localhost/api/weather?lat=51.5&lng=-0.1&date=2026-03-15"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(cachedForecast);
    // Should not have called external fetch
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches from Open-Meteo when cache is stale", async () => {
    // Stale cache (4 hours old)
    const staleTime = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const cacheChain = chainMock({
      data: {
        forecast_data: {},
        fetched_at: staleTime,
      },
      error: null,
    });

    const upsertChain = chainMock({ data: null, error: null });

    let callCount = 0;
    mockAdminClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return cacheChain;
      return upsertChain;
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          daily: {
            time: ["2026-03-15"],
            temperature_2m_max: [22],
            temperature_2m_min: [12],
            precipitation_probability_max: [20],
            wind_speed_10m_max: [10],
            weather_code: [0],
          },
        }),
    });

    const req = new Request(
      "http://localhost/api/weather?lat=51.5&lng=-0.1&date=2026-03-15"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.temperature_max).toBe(22);
    expect(body.weather_code).toBe(0);
    expect(mockFetch).toHaveBeenCalled();
  });

  it("fetches from Open-Meteo when no cache exists", async () => {
    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(chain);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          daily: {
            time: ["2026-03-15"],
            temperature_2m_max: [18],
            temperature_2m_min: [8],
            precipitation_probability_max: [50],
            wind_speed_10m_max: [25],
            weather_code: [3],
          },
        }),
    });

    const req = new Request(
      "http://localhost/api/weather?lat=51.5&lng=-0.1&date=2026-03-15"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.temperature_max).toBe(18);
    expect(body.precipitation_probability).toBe(50);
  });

  it("returns 502 when Open-Meteo returns non-ok response", async () => {
    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(chain);

    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const req = new Request(
      "http://localhost/api/weather?lat=51.5&lng=-0.1&date=2026-03-15"
    );
    const res = await GET(req);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch weather");
  });

  it("returns 404 when no forecast data available", async () => {
    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(chain);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ daily: { time: [] } }),
    });

    const req = new Request(
      "http://localhost/api/weather?lat=51.5&lng=-0.1&date=2026-03-15"
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("No forecast data available");
  });

  it("returns 502 when fetch throws an error", async () => {
    const chain = chainMock({ data: null, error: null });
    mockAdminClient.from.mockReturnValue(chain);

    mockFetch.mockRejectedValue(new Error("Network error"));

    const req = new Request(
      "http://localhost/api/weather?lat=51.5&lng=-0.1&date=2026-03-15"
    );
    const res = await GET(req);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Weather service unavailable");
  });
});
