import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/availability/calendar-view";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();

  // Get upcoming bookings (next 30 days)
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .gte("date", today.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0])
    .in("status", ["open", "full", "confirmed"])
    .order("date")
    .order("start_time");

  // Get signup counts
  const bookingIds = ((bookings as Array<Record<string, unknown>>) || []).map(
    (b) => b.id as string
  );
  const { data: signups } = bookingIds.length
    ? await supabase
        .from("signups")
        .select("booking_id, status")
        .in("booking_id", bookingIds)
    : { data: [] };

  const confirmedCounts = new Map<string, number>();
  ((signups as Array<Record<string, unknown>>) || []).forEach((s) => {
    if (s.status === "confirmed") {
      const bid = s.booking_id as string;
      confirmedCounts.set(bid, (confirmedCounts.get(bid) || 0) + 1);
    }
  });

  // Get organiser names
  const organiserIds = [
    ...new Set(
      ((bookings as Array<Record<string, unknown>>) || []).map(
        (b) => b.organiser_id as string
      )
    ),
  ];
  const { data: organisers } = organiserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", organiserIds)
    : { data: [] };

  const organiserMap = new Map(
    ((organisers as Array<Record<string, unknown>>) || []).map((o) => [
      o.id as string,
      o.full_name as string,
    ])
  );

  const formattedBookings = (
    (bookings as Array<Record<string, unknown>>) || []
  ).map((b) => ({
    id: b.id as string,
    venue_name: b.venue_name as string,
    venue_address: b.venue_address as string | null,
    date: b.date as string,
    start_time: b.start_time as string,
    end_time: b.end_time as string,
    total_cost: b.total_cost as number,
    max_players: b.max_players as number,
    status: b.status as string,
    is_outdoor: b.is_outdoor as boolean,
    venue_lat: b.venue_lat as number | null,
    venue_lng: b.venue_lng as number | null,
    confirmed_count: confirmedCounts.get(b.id as string) || 0,
    organiser_name: organiserMap.get(b.organiser_id as string) || "Unknown",
  }));

  // Get all availability for "who's free" feature
  const { data: allAvailability } = await supabase
    .from("availability")
    .select("user_id, day_of_week, start_time, end_time");

  const { data: allUnavailable } = await supabase
    .from("unavailable_dates")
    .select("user_id, date")
    .gte("date", today.toISOString().split("T")[0]);

  // Get all profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, skill_level");

  return (
    <CalendarView
      bookings={formattedBookings}
      availability={
        ((allAvailability as Array<Record<string, unknown>>) || []).map((a) => ({
          user_id: a.user_id as string,
          day_of_week: a.day_of_week as number,
          start_time: a.start_time as string,
          end_time: a.end_time as string,
        }))
      }
      unavailableDates={
        ((allUnavailable as Array<Record<string, unknown>>) || []).map((u) => ({
          user_id: u.user_id as string,
          date: u.date as string,
        }))
      }
      profiles={
        ((profiles as Array<Record<string, unknown>>) || []).map((p) => ({
          id: p.id as string,
          full_name: p.full_name as string,
          skill_level: p.skill_level as string | null,
        }))
      }
    />
  );
}
