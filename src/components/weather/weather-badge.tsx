"use client";

import { useEffect, useState } from "react";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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

interface WeatherBadgeProps {
  lat: number;
  lng: number;
  date: string;
  isOutdoor: boolean;
  compact?: boolean;
  startTime?: string;
  endTime?: string;
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
  if (code === 0) return "Clear skies";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 49) return "Foggy";
  if (code <= 55) return "Light drizzle";
  if (code <= 59) return "Heavy drizzle";
  if (code <= 63) return "Light rain";
  if (code <= 69) return "Heavy rain";
  if (code <= 75) return "Light snow";
  if (code <= 79) return "Heavy snow";
  if (code <= 82) return "Rain showers";
  if (code <= 84) return "Heavy rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

function getWarnings(weather: WeatherData, isOutdoor: boolean): string[] {
  const warnings: string[] = [];
  if (isOutdoor && weather.precipitation_probability > 50) {
    warnings.push(`${weather.precipitation_probability}% chance of rain — consider moving indoors`);
  }
  if (isOutdoor && weather.wind_speed_max > 30) {
    warnings.push(`Strong wind gusts up to ${Math.round(weather.wind_speed_max)} km/h`);
  }
  if (weather.temperature_min < 5) {
    warnings.push(`Cold conditions — low of ${Math.round(weather.temperature_min)}°C`);
  }
  return warnings;
}

function filterHourlyToWindow(hourly: HourlyEntry[], startTime: string, endTime: string): HourlyEntry[] {
  const startHour = parseInt(startTime.split(":")[0]);
  const endHour = parseInt(endTime.split(":")[0]);

  return hourly.filter((h) => {
    const hour = new Date(h.time).getHours();
    return hour >= startHour && hour <= endHour;
  });
}

export function WeatherBadge({
  lat,
  lng,
  date,
  isOutdoor,
  compact = false,
  startTime,
  endTime,
}: WeatherBadgeProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

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

  if (compact) {
    const rainWarning = isOutdoor && weather.precipitation_probability > 50;
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

  // Detailed non-compact view
  const warnings = getWarnings(weather, isOutdoor);
  const feelsLikeDiff = Math.abs(
    Math.round(weather.apparent_temperature_max) - Math.round(weather.temperature_max)
  );
  const showFeelsLike = feelsLikeDiff >= 2;

  // Get hourly data for the booking window
  const windowHours =
    startTime && endTime
      ? filterHourlyToWindow(weather.hourly || [], startTime, endTime)
      : [];

  return (
    <div className="space-y-2">
      {/* Warning banners */}
      {warnings.map((warning, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{warning}</span>
        </div>
      ))}

      {/* Summary row */}
      <div className="rounded-2xl border border-padel-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-padel-teal/10">
              <WeatherIcon className="h-5 w-5 text-padel-teal" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-padel-charcoal">
                {getWeatherLabel(weather.weather_code)}
              </p>
              <div className="flex items-center gap-3 text-xs text-padel-gray-400">
                <span className="flex items-center gap-1">
                  <Thermometer className="h-3 w-3" />
                  {Math.round(weather.temperature_min)}–{Math.round(weather.temperature_max)}°C
                  {showFeelsLike && (
                    <span className="text-padel-gray-400">
                      (feels {Math.round(weather.apparent_temperature_max)}°C)
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  {weather.precipitation_probability}%
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="h-3 w-3" />
                  {Math.round(weather.wind_speed_max)} km/h
                </span>
              </div>
            </div>
          </div>
          {windowHours.length > 0 && (
            expanded
              ? <ChevronUp className="h-4 w-4 text-padel-gray-400" />
              : <ChevronDown className="h-4 w-4 text-padel-gray-400" />
          )}
        </button>

        {/* Hourly breakdown (expanded) */}
        {expanded && windowHours.length > 0 && (
          <div className="border-t border-padel-gray-200 px-4 pb-4 pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-padel-gray-400">
              Hourly during game
            </p>
            <div className="space-y-1.5">
              {windowHours.map((h, i) => {
                const HourIcon = getWeatherIcon(h.weather_code);
                const hour = new Date(h.time).getHours();
                const timeStr = `${hour.toString().padStart(2, "0")}:00`;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-padel-soft-gray px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <HourIcon className="h-4 w-4 text-padel-teal" />
                      <span className="font-medium text-padel-charcoal">{timeStr}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-padel-gray-400">
                      <span>{Math.round(h.temperature)}°C</span>
                      <span className="flex items-center gap-0.5">
                        <Droplets className="h-3 w-3" />
                        {h.precipitation_probability}%
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Wind className="h-3 w-3" />
                        {Math.round(h.wind_speed)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
