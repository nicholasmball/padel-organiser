"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { BookingCard } from "@/components/bookings/booking-card";

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

const skillColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-blue-100 text-blue-800",
  advanced: "bg-purple-100 text-purple-800",
  pro: "bg-orange-100 text-orange-800",
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

    // Find users with availability on this day of week
    const usersAvailable = new Set<string>();
    availability.forEach((a) => {
      if (a.day_of_week === dayOfWeek) {
        usersAvailable.add(a.user_id);
      }
    });

    // Remove users who are unavailable on this specific date
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
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">
              {MONTH_NAMES[month]} {year}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="py-1 text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12" />
            ))}
            {/* Day cells */}
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
                  className={`relative flex h-12 flex-col items-center justify-center rounded-md text-sm transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-accent font-bold"
                        : "hover:bg-accent/50"
                  }`}
                >
                  {day}
                  <div className="flex gap-0.5">
                    {hasBookings && (
                      <div
                        className={`h-1 w-1 rounded-full ${
                          isSelected
                            ? "bg-primary-foreground"
                            : "bg-primary"
                        }`}
                      />
                    )}
                    {availCount > 0 && (
                      <div
                        className={`h-1 w-1 rounded-full ${
                          isSelected
                            ? "bg-primary-foreground/60"
                            : "bg-green-500"
                        }`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Booking
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              Members available
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected date details */}
      {selectedDate && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>

          {/* Bookings on this date */}
          {selectedBookings.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Bookings
              </h4>
              {selectedBookings.map((b) => (
                <BookingCard key={b.id} {...b} />
              ))}
            </div>
          )}

          {/* Available players */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Available Players ({selectedAvailable.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAvailable.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No members have set availability for this day.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedAvailable.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {p.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <span className="text-sm">{p.full_name}</span>
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
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
