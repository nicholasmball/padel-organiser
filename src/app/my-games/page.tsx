import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { BookingCard } from "@/components/bookings/booking-card";
import { Trophy, Calendar, PoundSterling } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "My Games" };
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

  // Get ALL signups for these bookings (to show player avatars)
  const { data: allSignups } = bookingIds.length
    ? await supabase
        .from("signups")
        .select("booking_id, user_id, status")
        .in("booking_id", bookingIds)
    : { data: [] };

  const allSignupList = (allSignups as Array<Record<string, unknown>>) || [];

  const confirmedCounts = new Map<string, number>();
  const confirmedUsersByBooking = new Map<string, string[]>();
  allSignupList.forEach((s) => {
    if (s.status === "confirmed") {
      const bid = s.booking_id as string;
      confirmedCounts.set(bid, (confirmedCounts.get(bid) || 0) + 1);
      const users = confirmedUsersByBooking.get(bid) || [];
      users.push(s.user_id as string);
      confirmedUsersByBooking.set(bid, users);
    }
  });

  // Get profiles for all confirmed players
  const allPlayerIds = [...new Set(allSignupList.filter(s => s.status === "confirmed").map(s => s.user_id as string))];
  const { data: playerProfiles } = allPlayerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allPlayerIds)
    : { data: [] };

  const playerNameMap = new Map(
    ((playerProfiles as Array<Record<string, unknown>>) || []).map((p) => [
      p.id as string,
      p.full_name as string,
    ])
  );

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

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-padel-charcoal" style={{ letterSpacing: "-0.01em" }}>My Padel Games History</h2>
        <p className="text-sm text-padel-gray-400">Organized by &lsquo;Padel Organiser&rsquo;</p>
      </div>

      {/* Stats — coloured circles per design guide */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-padel-teal/10">
              <Trophy className="h-6 w-6 text-padel-teal" />
            </div>
            <p className="text-2xl font-bold text-padel-charcoal">{gamesPlayed}</p>
            <p className="text-xs text-padel-gray-400">Played</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-padel-orange/10">
              <Calendar className="h-6 w-6 text-padel-orange" />
            </div>
            <p className="text-2xl font-bold text-padel-charcoal">{upcoming.length}</p>
            <p className="text-xs text-padel-gray-400">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-padel-lime/15">
              <PoundSterling className="h-6 w-6 text-padel-teal-dark" />
            </div>
            <p className="text-2xl font-bold text-padel-charcoal">{totalPaid}</p>
            <p className="text-xs text-padel-gray-400">Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming — custom cards with player avatars */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-padel-charcoal">Upcoming</h3>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-padel-gray-400">
                No upcoming games. Browse open games on the home page.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => {
              const bid = b.id as string;
              const confirmed = confirmedCounts.get(bid) || 0;
              const maxP = b.max_players as number;
              const cost = b.total_cost as number;
              const costPerPlayer = confirmed > 0 ? cost / confirmed : cost / maxP;
              const status = b.status as string;

              return (
                <Link key={bid} href={`/bookings/${bid}`}>
                  <div className={`flex items-center justify-between rounded-2xl border border-padel-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,128,128,0.08)]`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[15px] font-semibold text-padel-charcoal">{b.venue_name as string}</p>
                        <span className={`inline-block shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          (b.is_outdoor as boolean) ? "bg-padel-teal/10 text-padel-teal-dark" : "bg-blue-100 text-blue-800"
                        }`}>
                          {(b.is_outdoor as boolean) ? "Outdoor" : "Indoor"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px] text-padel-gray-400">
                        <span>{formatDate(b.date as string)}</span>
                        <span>{(b.start_time as string).slice(0, 5)} - {(b.end_time as string).slice(0, 5)}</span>
                        <span>{confirmed}/{maxP} players</span>
                      </div>
                    </div>
                    <div className="ml-3 flex flex-col items-end gap-1.5">
                      {cost > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-padel-charcoal">
                            £{costPerPlayer.toFixed(2)}<span className="text-[11px] font-normal text-padel-gray-400">/pp</span>
                          </span>
                          <span className="text-[11px] text-padel-gray-400">
                            £{cost.toFixed(2)} total
                          </span>
                        </div>
                      )}
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        status === "open"
                          ? "bg-padel-lime text-padel-charcoal"
                          : status === "full"
                            ? "bg-padel-teal text-white"
                            : "bg-padel-teal text-white"
                      }`}>
                        {status === "open" ? "Open" : status === "full" ? "Full" : "Confirmed"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Past */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-padel-charcoal">Past Games</h3>
        {past.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-padel-gray-400">
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
