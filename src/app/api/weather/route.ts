import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CACHE_HOURS = 3;

interface HourlyEntry {
  time: string;
  temperature: number;
  apparent_temperature: number;
  precipitation_probability: number;
  wind_speed: number;
  weather_code: number;
}

interface WeatherData {
  temperature_max: number;
  temperature_min: number;
  apparent_temperature_max: number;
  apparent_temperature_min: number;
  precipitation_probability: number;
  wind_speed_max: number;
  weather_code: number;
  hourly: HourlyEntry[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const date = searchParams.get("date");

  if (!lat || !lng || !date) {
    return NextResponse.json(
      { error: "Missing lat, lng, or date" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Check cache
  const { data: cached } = await supabase
    .from("weather_cache")
    .select("forecast_data, fetched_at")
    .eq("lat", parseFloat(parseFloat(lat).toFixed(4)))
    .eq("lng", parseFloat(parseFloat(lng).toFixed(4)))
    .eq("date", date)
    .single();

  if (cached) {
    const c = cached as unknown as {
      forecast_data: Record<string, unknown>;
      fetched_at: string;
    };
    const fetchedAt = new Date(c.fetched_at);
    const hoursOld =
      (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);

    if (hoursOld < CACHE_HOURS) {
      return NextResponse.json(c.forecast_data);
    }
  }

  // Fetch from Open-Meteo
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,wind_speed_10m_max,weather_code&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,weather_code&timezone=auto&start_date=${date}&end_date=${date}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch weather" },
        { status: 502 }
      );
    }

    const data = await response.json();

    const daily = data.daily;
    if (!daily || !daily.time || daily.time.length === 0) {
      return NextResponse.json(
        { error: "No forecast data available" },
        { status: 404 }
      );
    }

    // Build hourly entries
    const hourly = data.hourly;
    const hourlyEntries: HourlyEntry[] = [];
    if (hourly?.time) {
      for (let i = 0; i < hourly.time.length; i++) {
        hourlyEntries.push({
          time: hourly.time[i],
          temperature: hourly.temperature_2m[i],
          apparent_temperature: hourly.apparent_temperature[i],
          precipitation_probability: hourly.precipitation_probability[i],
          wind_speed: hourly.wind_speed_10m[i],
          weather_code: hourly.weather_code[i],
        });
      }
    }

    const forecast: WeatherData = {
      temperature_max: daily.temperature_2m_max[0],
      temperature_min: daily.temperature_2m_min[0],
      apparent_temperature_max: daily.apparent_temperature_max?.[0] ?? daily.temperature_2m_max[0],
      apparent_temperature_min: daily.apparent_temperature_min?.[0] ?? daily.temperature_2m_min[0],
      precipitation_probability: daily.precipitation_probability_max[0],
      wind_speed_max: daily.wind_speed_10m_max[0],
      weather_code: daily.weather_code[0],
      hourly: hourlyEntries,
    };

    // Upsert cache
    await supabase.from("weather_cache").upsert(
      {
        lat: parseFloat(parseFloat(lat).toFixed(4)),
        lng: parseFloat(parseFloat(lng).toFixed(4)),
        date,
        forecast_data: forecast as unknown as Record<string, unknown>,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "lat,lng,date" }
    );

    return NextResponse.json(forecast);
  } catch {
    return NextResponse.json(
      { error: "Weather service unavailable" },
      { status: 502 }
    );
  }
}
