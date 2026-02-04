import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingCard } from "@/components/bookings/booking-card";
import { History, Trophy, Calendar, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MyGamesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  // Get all bookings user is signed up for
  const { data: mySignups } = await supabase
    .from("signups")
    .select("booking_id, status, payment_status")
    .eq("user_id", user.id)
    .in("status", ["confirmed", "waitlist"]);

  const signupList = (mySignups as Array<Record<string, unknown>>) || [];
  const bookingIds = signupList.map((s) => s.booking_id as string);

  const { data: bookings } = bookingIds.length
    ? await supabase
        .from("bookings")
        .select("*")
        .in("id", bookingIds)
        .order("date", { ascending: false })
        .order("start_time", { ascending: false })
    : { data: [] };

  const allBookings = (bookings as Array<Record<string, unknown>>) || [];

  // Get signup counts
  const { data: allSignups } = bookingIds.length
    ? await supabase
        .from("signups")
        .select("booking_id, status")
        .in("booking_id", bookingIds)
    : { data: [] };

  const confirmedCounts = new Map<string, number>();
  ((allSignups as Array<Record<string, unknown>>) || []).forEach((s) => {
    if (s.status === "confirmed") {
      const bid = s.booking_id as string;
      confirmedCounts.set(bid, (confirmedCounts.get(bid) || 0) + 1);
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

  // Split into upcoming and past
  const today = new Date().toISOString().split("T")[0];
  const upcoming = allBookings.filter(
    (b) =>
      (b.date as string) >= today &&
      b.status !== "cancelled" &&
      b.status !== "completed"
  );
  const past = allBookings.filter(
    (b) =>
      (b.date as string) < today ||
      b.status === "completed" ||
      b.status === "cancelled"
  );

  // Stats
  const gamesPlayed = past.filter((b) => b.status !== "cancelled").length;
  const totalPaid = signupList.filter(
    (s) => s.payment_status === "paid"
  ).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">My Games</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <Trophy className="mb-1 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{gamesPlayed}</p>
            <p className="text-xs text-muted-foreground">Played</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <Calendar className="mb-1 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{upcoming.length}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <DollarSign className="mb-1 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{totalPaid}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Upcoming</h3>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No upcoming games. Browse open games on the home page.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => (
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
                venue_lat={b.venue_lat as number | null}
                venue_lng={b.venue_lng as number | null}
                confirmed_count={confirmedCounts.get(b.id as string) || 0}
                organiser_name={
                  organiserMap.get(b.organiser_id as string) || "Unknown"
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Past Games</h3>
        {past.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No past games yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {past.map((b) => (
              <div key={b.id as string} className="opacity-75">
                <BookingCard
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
                  venue_lat={b.venue_lat as number | null}
                  venue_lng={b.venue_lng as number | null}
                  confirmed_count={confirmedCounts.get(b.id as string) || 0}
                  organiser_name={
                    organiserMap.get(b.organiser_id as string) || "Unknown"
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
