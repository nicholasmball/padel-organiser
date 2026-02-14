import { describe, it, expect, vi, beforeEach } from "vitest";
import { geocodeAddress } from "@/lib/geocode";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function mockNominatimResponse(lat: string, lon: string) {
  return {
    ok: true,
    json: () => Promise.resolve([{ lat, lon }]),
  };
}

function mockEmptyResponse() {
  return {
    ok: true,
    json: () => Promise.resolve([]),
  };
}

describe("geocodeAddress", () => {
  it("returns coordinates from full address", async () => {
    mockFetch.mockResolvedValueOnce(mockNominatimResponse("51.5074", "-0.1278"));

    const result = await geocodeAddress("10 Downing Street, London");
    expect(result).toEqual({ lat: 51.5074, lng: -0.1278 });
  });

  it("sends correct query params and headers", async () => {
    mockFetch.mockResolvedValueOnce(mockNominatimResponse("51.5", "-0.1"));

    await geocodeAddress("Test Address");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/search"),
      expect.objectContaining({
        headers: { "User-Agent": "PadelOrganiser/1.0" },
      })
    );

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("countrycodes=gb");
    expect(url).toContain("format=json");
    expect(url).toContain("limit=1");
  });

  it("falls back to UK postcode when full address fails", async () => {
    mockFetch
      .mockResolvedValueOnce(mockEmptyResponse()) // Full address fails
      .mockResolvedValueOnce(mockNominatimResponse("51.5", "-0.1")); // Postcode succeeds

    const result = await geocodeAddress(
      "Some Padel Club, 123 Fake St, SW1A 1AA"
    );
    expect(result).toEqual({ lat: 51.5, lng: -0.1 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns null when no postcode and full address fails", async () => {
    mockFetch.mockResolvedValueOnce(mockEmptyResponse());

    const result = await geocodeAddress("Unknown Place");
    expect(result).toBeNull();
  });

  it("returns null when both full address and postcode fail", async () => {
    mockFetch
      .mockResolvedValueOnce(mockEmptyResponse())
      .mockResolvedValueOnce(mockEmptyResponse());

    const result = await geocodeAddress("123 Fake St, SW1A 1AA");
    expect(result).toBeNull();
  });

  it("returns null on fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await geocodeAddress("10 Downing Street");
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const result = await geocodeAddress("London");
    expect(result).toBeNull();
  });

  it("extracts various UK postcode formats", async () => {
    const postcodes = [
      "SW1A 1AA", // Standard
      "EC1A 1BB", // EC format
      "W1A 0AX",  // Single letter area
      "M1 1AE",   // Short format
      "B33 8TH",  // B area
    ];

    for (const postcode of postcodes) {
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce(mockEmptyResponse()) // Full address fails
        .mockResolvedValueOnce(mockNominatimResponse("51.5", "-0.1"));

      const result = await geocodeAddress(`Venue, ${postcode}`);
      expect(result).toEqual({ lat: 51.5, lng: -0.1 });
    }
  });
});
