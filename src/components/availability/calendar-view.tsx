"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

interface Booking {
  id: string;
  venue_name: string;
  venue_address: string | null;
  date: string;
  start_time: string;
  end_time: string;
  total_cost: number;
  max_players: number;
  status: string;
  is_outdoor: boolean;
  venue_lat: number | null;
  venue_lng: number | null;
  confirmed_count: number;
  organiser_name: string;
}

interface AvailabilitySlot {
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface UnavailableDate {
  user_id: string;
  date: string;
}

interface Profile {
  id: string;
  full_name: string;
  skill_level: string | null;
}

interface CalendarViewProps {
  bookings: Booking[];
  availability: AvailabilitySlot[];
  unavailableDates: UnavailableDate[];
  profiles: Profile[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const statusColors: Record<string, string> = {
  open: "bg-padel-lime text-padel-charcoal",
  full: "bg-padel-teal text-white",
  confirmed: "bg-padel-teal text-white",
  completed: "bg-padel-gray-200 text-padel-gray-400",
  cancelled: "bg-padel-red/15 text-padel-red",
};

const statusLabel: Record<string, string> = {
  open: "Open",
  full: "Full",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const skillColors: Record<string, string> = {
  beginner: "bg-[rgba(0,128,128,0.08)] text-padel-teal",
  intermediate: "bg-[rgba(0,128,128,0.12)] text-padel-teal-dark",
  advanced: "bg-[rgba(128,0,128,0.08)] text-purple-700",
  pro: "bg-[rgba(204,255,0,0.2)] text-padel-teal-dark",
};

export function CalendarView({
  bookings,
  availability,
  unavailableDates,
  profiles,
}: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Build a map of bookings per date
  const bookingsByDate = new Map<string, Booking[]>();
  bookings.forEach((b) => {
    const existing = bookingsByDate.get(b.date) || [];
    existing.push(b);
    bookingsByDate.set(b.date, existing);
  });

  // Build unavailable set per user per date
  const unavailableSet = new Set<string>();
  unavailableDates.forEach((u) => {
    unavailableSet.add(`${u.user_id}:${u.date}`);
  });

  function getAvailableProfiles(dateStr: string): Profile[] {
    const d = new Date(dateStr + "T00:00:00");
    const dayOfWeek = d.getDay();

    const usersAvailable = new Set<string>();
    availability.forEach((a) => {
      if (a.day_of_week === dayOfWeek) {
        usersAvailable.add(a.user_id);
      }
    });

    usersAvailable.forEach((userId) => {
      if (unavailableSet.has(`${userId}:${dateStr}`)) {
        usersAvailable.delete(userId);
      }
    });

    return profiles.filter((p) => usersAvailable.has(p.id));
  }

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(null);
  }

  const selectedBookings = selectedDate
    ? bookingsByDate.get(selectedDate) || []
    : [];
  const selectedAvailable = selectedDate
    ? getAvailableProfiles(selectedDate)
    : [];

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-[480px] space-y-4">
      {/* Calendar in white card */}
      <div className="overflow-hidden rounded-[20px] border border-padel-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4">
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-padel-soft-gray text-padel-teal transition-colors hover:bg-padel-gray-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-[17px] font-semibold text-padel-charcoal">
            {MONTH_NAMES[month]} {year}
          </h3>
          <button
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-padel-soft-gray text-padel-teal transition-colors hover:bg-padel-gray-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-4">
          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="py-1 text-[12px] font-medium uppercase text-padel-gray-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasBookings = bookingsByDate.has(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const availCount = getAvailableProfiles(dateStr).length;

              return (
                <button
                  key={day}
                  onClick={() =>
                    setSelectedDate(isSelected ? null : dateStr)
                  }
                  className={`relative flex h-12 flex-col items-center justify-center rounded-xl text-sm transition-all duration-250 ${
                    isSelected
                      ? "bg-padel-teal text-white font-bold"
                      : isToday
                        ? "ring-2 ring-padel-teal font-bold text-padel-teal"
                        : "hover:bg-padel-soft-gray"
                  }`}
                >
                  {day}
                  <div className="flex gap-0.5">
                    {hasBookings && (
                      <div
                        className={`h-1 w-1 rounded-full ${
                          isSelected ? "bg-white" : "bg-padel-teal"
                        }`}
                      />
                    )}
                    {availCount > 0 && (
                      <div
                        className={`h-1 w-1 rounded-full ${
                          isSelected ? "bg-white/60" : "bg-padel-lime"
                        }`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-xs text-padel-gray-400">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-padel-teal" />
              Booking
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-padel-lime" />
              Members available
            </div>
          </div>
        </div>
      </div>

      {/* Selected date details */}
      {selectedDate && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-padel-charcoal">
            Selected Day Activities
          </h3>

          {/* Activity cards */}
          {selectedBookings.length > 0 ? (
            <div className="space-y-3">
              {selectedBookings.map((b) => {
                const costPerPlayer =
                  b.confirmed_count > 0
                    ? b.total_cost / b.confirmed_count
                    : b.total_cost / b.max_players;

                return (
                  <div key={b.id} className="overflow-hidden rounded-[20px] border border-padel-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    {/* Venue + badges */}
                    <div className="flex items-start justify-between">
                      <p className="font-bold text-padel-charcoal">{b.venue_name}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${b.is_outdoor ? "bg-padel-teal/10 text-padel-teal-dark" : "bg-blue-100 text-blue-800"}`}
                        >
                          {b.is_outdoor ? "Outdoor" : "Indoor"}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${statusColors[b.status] || ""}`}
                        >
                          {statusLabel[b.status] || b.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Meta row with emojis */}
                    <div className="mt-2 flex items-center gap-4 text-[13px] text-padel-gray-400">
                      <span>🕐 {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</span>
                      <span>👥 {b.confirmed_count}/{b.max_players}</span>
                      {b.total_cost > 0 && (
                        <span className="font-medium text-padel-charcoal">
                          £{costPerPlayer.toFixed(2)}/player
                        </span>
                      )}
                    </div>

                    {/* Full-width button */}
                    <Link href={`/bookings/${b.id}`} className="mt-3 block">
                      {b.status === "open" ? (
                        <button className="w-full rounded-xl bg-padel-teal py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-padel-teal-dark active:scale-[0.98]">
                          Join
                        </button>
                      ) : (
                        <button className="w-full rounded-xl border-[1.5px] border-padel-teal py-2.5 text-[13px] font-semibold text-padel-teal transition-all hover:bg-padel-teal hover:text-white active:scale-[0.98]">
                          View Details
                        </button>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-sm text-padel-gray-400">
                  No bookings on this day.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Available players */}
          {selectedAvailable.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-padel-charcoal">
                  <Users className="h-4 w-4" />
                  Available Players ({selectedAvailable.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedAvailable.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 rounded-full border border-padel-gray-200 px-3 py-1.5"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-padel-teal text-xs font-medium text-white">
                        {p.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <span className="text-sm text-padel-charcoal">{p.full_name}</span>
                      {p.skill_level && (
                        <Badge
                          variant="secondary"
                          className={`text-xs capitalize ${skillColors[p.skill_level] || ""}`}
                        >
                          {p.skill_level}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
