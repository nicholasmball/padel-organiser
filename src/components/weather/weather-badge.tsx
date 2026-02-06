"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Snowflake,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
} from "lucide-react";

interface WeatherData {
  temperature_max: number;
  temperature_min: number;
  precipitation_probability: number;
  wind_speed_max: number;
  weather_code: number;
}

interface WeatherBadgeProps {
  lat: number;
  lng: number;
  date: string;
  isOutdoor: boolean;
  compact?: boolean;
}

function getWeatherIcon(code: number) {
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code <= 49) return CloudFog;
  if (code <= 59) return CloudDrizzle;
  if (code <= 69) return CloudRain;
  if (code <= 79) return CloudSnow;
  if (code <= 84) return CloudRain;
  if (code <= 86) return Snowflake;
  if (code <= 99) return CloudLightning;
  return Cloud;
}

function getWeatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow";
  if (code <= 84) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

export function WeatherBadge({
  lat,
  lng,
  date,
  isOutdoor,
  compact = false,
}: WeatherBadgeProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lat || !lng) {
      setLoading(false);
      return;
    }

    async function fetchWeather() {
      try {
        const res = await fetch(
          `/api/weather?lat=${lat}&lng=${lng}&date=${date}`
        );
        if (res.ok) {
          const data = await res.json();
          setWeather(data);
        }
      } catch {
        // Silently fail - weather is non-critical
      }
      setLoading(false);
    }

    fetchWeather();
  }, [lat, lng, date]);

  if (loading || !weather) return null;

  const WeatherIcon = getWeatherIcon(weather.weather_code);
  const rainWarning =
    isOutdoor && weather.precipitation_probability > 50;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <WeatherIcon className="h-5 w-5 text-white" />
        <span className="text-sm font-medium text-white">
          {Math.round(weather.temperature_max)}°C
        </span>
        {rainWarning && (
          <AlertTriangle className="h-4 w-4 text-amber-300" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rainWarning && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {weather.precipitation_probability}% chance of rain — consider
            moving indoors
          </span>
        </div>
      )}
      <div className="flex items-center gap-4 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <WeatherIcon className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">
            {getWeatherLabel(weather.weather_code)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Thermometer className="h-3.5 w-3.5" />
            {Math.round(weather.temperature_min)}–
            {Math.round(weather.temperature_max)}°C
          </span>
          <span className="flex items-center gap-1">
            <Droplets className="h-3.5 w-3.5" />
            {weather.precipitation_probability}%
          </span>
          <span className="flex items-center gap-1">
            <Wind className="h-3.5 w-3.5" />
            {Math.round(weather.wind_speed_max)} km/h
          </span>
        </div>
      </div>
    </div>
  );
}
