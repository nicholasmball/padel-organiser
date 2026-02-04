const UK_POSTCODE_REGEX = /[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i;

async function nominatimSearch(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "gb",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "User-Agent": "PadelOrganiser/1.0",
      },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data || data.length === 0) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    // Try full address first
    const result = await nominatimSearch(address);
    if (result) return result;

    // Fall back to postcode if present
    const postcodeMatch = address.match(UK_POSTCODE_REGEX);
    if (postcodeMatch) {
      return await nominatimSearch(postcodeMatch[0]);
    }

    return null;
  } catch {
    return null;
  }
}
