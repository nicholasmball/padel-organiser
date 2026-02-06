import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users } from "lucide-react";
import Link from "next/link";
import { PadelHero } from "@/components/ui/padel-hero";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default async function Home() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's full name for personalised greeting
  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (profile) {
      fullName = (profile as Record<string, unknown>).full_name as string;
    }
  }

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
  const myBookingStatuses = new Map<string, string>();
  signupList.forEach((s) => {
    if (s.status === "confirmed") {
      const bid = s.booking_id as string;
      confirmedCounts.set(bid, (confirmedCounts.get(bid) || 0) + 1);
    }
    if (user && s.user_id === user.id && s.status !== "interested") {
      myBookingIds.add(s.booking_id as string);
      myBookingStatuses.set(s.booking_id as string, s.status as string);
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

  // Fetch latest 3 notifications for the current user
  let latestNotifications: Array<{
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }> = [];
  if (user) {
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);
    latestNotifications = ((notifs as Array<Record<string, unknown>>) || []).map((n) => ({
      id: n.id as string,
      title: n.title as string,
      message: n.message as string,
      is_read: n.is_read as boolean,
      created_at: n.created_at as string,
    }));
  }

  const firstName = fullName?.split(" ")[0];

  return (
    <div className="max-w-2xl space-y-6">
      <section className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-padel-charcoal" style={{ letterSpacing: "-0.01em" }}>
          {user && firstName ? (
            <>
              Welcome back,{" "}
              <span className="text-padel-teal">{firstName}</span>!
            </>
          ) : user ? (
            "Welcome back!"
          ) : (
            "Padel Organiser"
          )}
        </h2>
        <p className="text-sm text-padel-gray-400">
          {user
            ? "Find open games, track your bookings, and connect with players."
            : "Sign in to join games and create bookings."}
        </p>
      </section>

      {user && <PadelHero />}

      {/* My upcoming games — compact flex-row cards */}
      {user && (
        <section className="-mx-4 rounded-2xl bg-padel-teal/5 px-4 py-4 space-y-3 md:-mx-0 md:px-5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-padel-charcoal">My Upcoming Games</h3>
            {myGames.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-padel-teal px-1.5 text-[11px] font-bold text-white">
                {myGames.length}
              </span>
            )}
          </div>
          {myGames.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="mb-3 h-10 w-10 text-padel-gray-400/50" />
                <p className="text-sm text-padel-gray-400">
                  No upcoming games yet.
                </p>
                <Link
                  href="/bookings/new"
                  className="mt-3 inline-block rounded-xl bg-padel-teal px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-padel-teal-dark"
                >
                  Create a Booking
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myGames.map((b) => {
                const status = b.status as string;
                const myStatus = myBookingStatuses.get(b.id as string);
                const confirmed = confirmedCounts.get(b.id as string) || 0;
                const max = b.max_players as number;
                const costPerPlayer = confirmed > 0 ? (b.total_cost as number) / confirmed : (b.total_cost as number) / max;
                const isWaitlisted = myStatus === "waitlist";

                return (
                  <Link key={b.id as string} href={`/bookings/${b.id as string}`}>
                    <div className="flex items-center justify-between rounded-2xl border border-padel-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,128,128,0.08)]">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[15px] font-semibold text-padel-charcoal">{b.venue_name as string}</p>
                          <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                            (b.is_outdoor as boolean) ? "bg-padel-teal/10 text-padel-teal-dark" : "bg-blue-100 text-blue-800"
                          }`}>
                            {(b.is_outdoor as boolean) ? "Outdoor" : "Indoor"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px] text-padel-gray-400">
                          <span>{formatDate(b.date as string)}</span>
                          <span>{formatTime(b.start_time as string)} - {formatTime(b.end_time as string)}</span>
                          <span>{confirmed}/{max} players</span>
                        </div>
                      </div>
                      <div className="ml-3 flex flex-col items-end gap-1.5">
                        {(b.total_cost as number) > 0 && (
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-padel-charcoal">
                              £{costPerPlayer.toFixed(2)}<span className="text-[11px] font-normal text-padel-gray-400">/pp</span>
                            </span>
                            <span className="text-[11px] text-padel-gray-400">
                              £{(b.total_cost as number).toFixed(2)} total
                            </span>
                          </div>
                        )}
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          status === "open"
                            ? "bg-padel-lime text-padel-charcoal"
                            : status === "full"
                              ? "bg-padel-teal text-white"
                              : isWaitlisted
                                ? "bg-[rgba(255,152,0,0.15)] text-[#E65100]"
                                : "bg-padel-teal text-white"
                        }`}>
                          {isWaitlisted ? "Waitlisted" : status === "open" ? "Open" : status === "full" ? "Full" : "Confirmed"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Open games — redesigned scroll cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-padel-charcoal">Open Games</h3>
          {openGames.length > 3 && (
            <Link href="/calendar" className="text-sm font-medium text-padel-teal">
              See All
            </Link>
          )}
        </div>
        {openGames.length === 0 && allBookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-3 h-10 w-10 text-padel-gray-400/50" />
              <p className="text-sm text-padel-gray-400">
                No open games right now.
              </p>
              <Link
                href="/bookings/new"
                className="mt-3 inline-block rounded-xl bg-padel-teal px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-padel-teal-dark"
              >
                Create a Booking
              </Link>
            </CardContent>
          </Card>
        ) : openGames.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-padel-gray-400">
                No other open games at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none snap-x snap-mandatory">
            {openGames.map((b) => {
              const confirmed = confirmedCounts.get(b.id as string) || 0;
              const max = b.max_players as number;
              const spotsLeft = max - confirmed;
              const cost = b.total_cost as number;
              const costPP = confirmed > 0 ? cost / confirmed : cost / max;

              return (
                <Link
                  key={b.id as string}
                  href={`/bookings/${b.id as string}`}
                  className="w-[220px] flex-shrink-0 snap-start"
                >
                  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-padel-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,128,128,0.08)]">
                    <div className="flex-1 space-y-2.5 p-4">
                      <p className="text-[15px] font-semibold leading-tight text-padel-charcoal">
                        {b.venue_name as string}
                      </p>
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        (b.is_outdoor as boolean)
                          ? "bg-padel-lime text-padel-charcoal"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {(b.is_outdoor as boolean) ? "Outdoor" : "Indoor"}
                      </span>
                      <div className="space-y-1 text-[13px] text-padel-gray-400">
                        <div className="flex items-center gap-1.5">
                          <span>📅</span>
                          <span>{formatDate(b.date as string)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>🕐</span>
                          <span>{formatTime(b.start_time as string)} - {formatTime(b.end_time as string)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-padel-teal">
                          {spotsLeft > 0
                            ? `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`
                            : "Full"}
                        </p>
                        {cost > 0 && (
                          <div className="text-right">
                            <p className="text-[13px] font-bold text-padel-charcoal">
                              £{costPP.toFixed(2)}<span className="text-[11px] font-normal text-padel-gray-400">/pp</span>
                            </p>
                            <p className="text-[11px] text-padel-gray-400">
                              £{cost.toFixed(2)} total
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="px-4 pb-4">
                      <div className="w-full rounded-xl bg-padel-teal py-2.5 text-center text-[13px] font-semibold text-white">
                        Join Game
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Notifications section */}
      {user && latestNotifications.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-padel-charcoal">Notifications</h3>
            <Link href="/notifications" className="text-sm font-medium text-padel-teal">
              View All →
            </Link>
          </div>
          <div className="rounded-2xl border border-padel-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {latestNotifications.map((n, i) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 ${
                  i < latestNotifications.length - 1 ? "border-b border-padel-gray-200" : ""
                }`}
              >
                <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  n.is_read ? "bg-padel-gray-200" : "bg-padel-teal"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-padel-charcoal">
                    <span className="font-bold">{n.title}</span>{" "}
                    <span className="text-padel-gray-400">{n.message}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-padel-gray-400">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
