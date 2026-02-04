import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, PlusCircle } from "lucide-react";
import Link from "next/link";
import { BookingCard } from "@/components/bookings/booking-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get open/full bookings (upcoming, not cancelled/completed)
  const today = new Date().toISOString().split("T")[0];
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .gte("date", today)
    .in("status", ["open", "full", "confirmed"])
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(20);

  const allBookings = (bookings as Array<Record<string, unknown>>) || [];

  // Get signup counts per booking
  const bookingIds = allBookings.map((b) => b.id as string);
  const { data: signups } = bookingIds.length
    ? await supabase
        .from("signups")
        .select("booking_id, user_id, status")
        .in("booking_id", bookingIds)
    : { data: [] };

  const signupList = (signups as Array<Record<string, unknown>>) || [];

  // Count confirmed per booking
  const confirmedCounts = new Map<string, number>();
  const myBookingIds = new Set<string>();
  signupList.forEach((s) => {
    if (s.status === "confirmed") {
      const bid = s.booking_id as string;
      confirmedCounts.set(bid, (confirmedCounts.get(bid) || 0) + 1);
    }
    if (user && s.user_id === user.id && s.status !== "interested") {
      myBookingIds.add(s.booking_id as string);
    }
  });

  // Get organiser names
  const organiserIds = [
    ...new Set(allBookings.map((b) => b.organiser_id as string)),
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

  // Split into my games and open games
  const myGames = allBookings.filter((b) => myBookingIds.has(b.id as string));
  const openGames = allBookings.filter(
    (b) =>
      !myBookingIds.has(b.id as string) &&
      (b.status === "open" || b.status === "confirmed")
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {user ? "Welcome back" : "Padel Organiser"}
        </h2>
        <p className="text-muted-foreground">
          {user
            ? "Find open games, track your bookings, and connect with players."
            : "Sign in to join games and create bookings."}
        </p>
      </section>

      {user && (
        <Link href="/bookings/new">
          <Button className="w-full gap-2" size="lg">
            <PlusCircle className="h-5 w-5" />
            Create New Booking
          </Button>
        </Link>
      )}

      {/* My upcoming games */}
      {user && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">My Upcoming Games</h3>
          {myGames.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No upcoming games yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Sign up for an open game or create a booking.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myGames.map((b) => (
                <BookingCard
                  key={b.id as string}
                  id={b.id as string}
                  venue_name={b.venue_name as string}
                  venue_address={b.venue_address as string | null}
                  date={b.date as string}
                  start_time={b.start_time as string}
                  end_time={b.end_time as string}
                  total_cost={b.total_cost as number}
                  max_players={b.max_players as number}
                  status={b.status as string}
                  is_outdoor={b.is_outdoor as boolean}
                  confirmed_count={confirmedCounts.get(b.id as string) || 0}
                  organiser_name={
                    organiserMap.get(b.organiser_id as string) || "Unknown"
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Open games */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Open Games</h3>
        {openGames.length === 0 && allBookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No open games right now.
              </p>
              <p className="text-sm text-muted-foreground">
                Check back later or create one yourself.
              </p>
            </CardContent>
          </Card>
        ) : openGames.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No other open games at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {openGames.map((b) => (
              <BookingCard
                key={b.id as string}
                id={b.id as string}
                venue_name={b.venue_name as string}
                venue_address={b.venue_address as string | null}
                date={b.date as string}
                start_time={b.start_time as string}
                end_time={b.end_time as string}
                total_cost={b.total_cost as number}
                max_players={b.max_players as number}
                status={b.status as string}
                is_outdoor={b.is_outdoor as boolean}
                confirmed_count={confirmedCounts.get(b.id as string) || 0}
                organiser_name={
                  organiserMap.get(b.organiser_id as string) || "Unknown"
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
