"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  signUpForBooking,
  leaveBooking,
  deleteBooking,
  markInterested,
} from "@/lib/actions/bookings";
import { togglePaymentStatus } from "@/lib/actions/payments";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, Share2, MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { WeatherBadge } from "@/components/weather/weather-badge";

interface Signup {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  position: number | null;
  profile?: {
    full_name: string;
    skill_level: string | null;
    phone?: string | null;
  };
}

interface BookingDetailProps {
  booking: {
    id: string;
    organiser_id: string;
    venue_name: string;
    venue_address: string | null;
    venue_lat: number | null;
    venue_lng: number | null;
    court_number: string | null;
    is_outdoor: boolean;
    date: string;
    start_time: string;
    end_time: string;
    total_cost: number;
    max_players: number;
    notes: string | null;
    status: string;
    signup_deadline: string | null;
  };
  organiserName: string;
  signups: Signup[];
}

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

export function BookingDetail({
  booking,
  organiserName,
  signups,
}: BookingDetailProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOrganiser = user?.id === booking.organiser_id;
  const mySignup = signups.find((s) => s.user_id === user?.id);
  const isSignedUp = !!mySignup;
  const confirmedSignups = signups.filter((s) => s.status === "confirmed");
  const waitlistSignups = signups.filter((s) => s.status === "waitlist");
  const interestedSignups = signups.filter((s) => s.status === "interested");
  const isCancelled = booking.status === "cancelled";

  const costPerPlayer =
    confirmedSignups.length > 0
      ? booking.total_cost / confirmedSignups.length
      : booking.total_cost / booking.max_players;

  // Build empty slots
  const emptySlots = Math.max(0, booking.max_players - confirmedSignups.length);

  async function handleSignUp() {
    setLoading(true);
    setError(null);
    const result = await signUpForBooking(booking.id);
    if (result.error) setError(result.error);
    setLoading(false);
    router.refresh();
  }

  async function handleInterested() {
    setLoading(true);
    setError(null);
    const result = await markInterested(booking.id);
    if (result.error) setError(result.error);
    setLoading(false);
    router.refresh();
  }

  async function handleLeave() {
    setLoading(true);
    setError(null);
    const result = await leaveBooking(booking.id);
    if (result.error) setError(result.error);
    setLoading(false);
    router.refresh();
  }

  async function handleCancel() {
    setLoading(true);
    const result = await deleteBooking(booking.id);
    if (result.error) setError(result.error);
    setLoading(false);
    router.refresh();
  }

  async function handleShare() {
    const url = `${window.location.origin}/bookings/${booking.id}`;
    const shareData = {
      title: `Padel at ${booking.venue_name}`,
      text: `${formatDate(booking.date)} ${formatTime(booking.start_time)}-${formatTime(booking.end_time)}`,
      url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="space-y-4">
      {/* Teal gradient header */}
      <div
        className="relative overflow-hidden px-5 pb-6 pt-5"
        style={{
          background: "linear-gradient(135deg, #008080, #00A3A3)",
          borderRadius: "0 0 24px 24px",
        }}
      >
        {/* Top row: back + edit */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <Share2 className="h-4 w-4" />
            </button>
            {isOrganiser && (
              <Link
                href={`/bookings/${booking.id}/edit`}
                className="rounded-full px-4 py-1.5 text-[13px] font-medium text-white"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                ✏️ Edit
              </Link>
            )}
          </div>
        </div>

        {/* Venue name + organiser */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">{booking.venue_name}</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>
            Organised by {organiserName}
          </p>
        </div>

        {/* Detail chips + weather */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-[10px] px-3 py-1.5 text-[13px] font-medium text-white"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            📅 {formatDate(booking.date)}
          </span>
          <span
            className="rounded-[10px] px-3 py-1.5 text-[13px] font-medium text-white"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            🕐 {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </span>
          {booking.court_number && (
            <span
              className="rounded-[10px] px-3 py-1.5 text-[13px] font-medium text-white"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              🏟️ {booking.court_number}
            </span>
          )}
          {booking.total_cost > 0 && (
            <span
              className="rounded-[10px] px-3 py-1.5 text-[13px] font-medium text-white"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              💷 £{costPerPlayer.toFixed(2)}/player
            </span>
          )}
        </div>

        {/* Weather badge positioned top-right area */}
        {booking.is_outdoor && booking.venue_lat && booking.venue_lng && (
          <div className="absolute right-4 top-16 rounded-xl p-2" style={{ background: "rgba(255,255,255,0.18)" }}>
            <WeatherBadge
              lat={booking.venue_lat}
              lng={booking.venue_lng}
              date={booking.date}
              isOutdoor={booking.is_outdoor}
              compact
            />
          </div>
        )}
      </div>

      {/* Notes */}
      {booking.notes && (
        <div className="rounded-2xl border border-padel-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="text-sm text-padel-charcoal">{booking.notes}</p>
        </div>
      )}

      {/* Players section — 2×2 grid */}
      <div className="rounded-2xl border border-padel-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <h3 className="mb-3 text-base font-semibold text-padel-charcoal">
          Players ({confirmedSignups.length}/{booking.max_players})
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Filled slots */}
          {confirmedSignups.map((signup) => (
            <div
              key={signup.id}
              className="flex flex-col items-center rounded-2xl border border-padel-gray-200 bg-white p-4"
            >
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-padel-teal text-sm font-semibold text-white">
                {getInitials(signup.profile?.full_name || "?")}
              </div>
              <p className="text-center text-[13px] font-medium text-padel-charcoal">
                {signup.profile?.full_name || "Unknown"}
              </p>
              {signup.user_id === booking.organiser_id && (
                <span className="mt-0.5 text-[11px] text-padel-gray-400">Organiser</span>
              )}
              {/* Payment badge */}
              {booking.total_cost > 0 && (
                <button
                  onClick={async () => {
                    if (!user) return;
                    if (user.id !== signup.user_id && !isOrganiser) return;
                    await togglePaymentStatus(signup.id, booking.id);
                    router.refresh();
                  }}
                  disabled={!user || (user.id !== signup.user_id && !isOrganiser)}
                  className="mt-2 cursor-pointer disabled:cursor-default"
                >
                  <span
                    className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                      signup.payment_status === "paid"
                        ? "bg-[rgba(204,255,0,0.15)] text-padel-teal-dark"
                        : "bg-[rgba(229,57,53,0.15)] text-[#E53935]"
                    } ${
                      user && (user.id === signup.user_id || isOrganiser) ? "hover:opacity-70" : ""
                    }`}
                  >
                    {signup.payment_status === "paid" ? "Paid" : "Unpaid"}
                  </span>
                </button>
              )}
              {/* WhatsApp button */}
              {signup.profile?.phone && user && signup.user_id !== user.id && (
                <a
                  href={getWhatsAppUrl(signup.profile.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-padel-teal transition-colors hover:text-padel-teal-dark"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              )}
            </div>
          ))}
          {/* Empty slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-padel-gray-200 p-4"
            >
              <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-padel-gray-200 text-padel-gray-400">
                <span className="text-lg">+</span>
              </div>
              <p className="text-[12px] text-padel-gray-400">Open Spot</p>
            </div>
          ))}
        </div>

        {/* Waitlist */}
        {waitlistSignups.length > 0 && (
          <>
            <Separator className="my-4" />
            <p className="mb-2 text-xs font-medium uppercase text-padel-gray-400">
              Waitlist
            </p>
            <div className="space-y-2">
              {waitlistSignups.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center gap-2 text-sm text-padel-gray-400"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-padel-gray-200/50 text-xs font-medium text-padel-gray-400">
                    {getInitials(signup.profile?.full_name || "?")}
                  </div>
                  <span>{signup.profile?.full_name || "Unknown"}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Interested */}
        {interestedSignups.length > 0 && (
          <>
            <Separator className="my-4" />
            <p className="mb-2 text-xs font-medium uppercase text-padel-gray-400">
              Interested
            </p>
            <div className="space-y-2">
              {interestedSignups.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center gap-2 text-sm text-padel-gray-400"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-padel-gray-200/50 text-xs font-medium text-padel-gray-400">
                    {getInitials(signup.profile?.full_name || "?")}
                  </div>
                  <span>{signup.profile?.full_name || "Unknown"}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Payment summary */}
      {booking.total_cost > 0 && confirmedSignups.length > 0 && (
        <div className="rounded-2xl border border-padel-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <h3 className="mb-3 text-base font-semibold text-padel-charcoal">Payment Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-padel-gray-400">Total cost</span>
              <span className="font-medium text-padel-charcoal">£{booking.total_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-padel-gray-400">Per player ({confirmedSignups.length} players)</span>
              <span className="font-medium text-padel-charcoal">£{costPerPlayer.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-padel-gray-400">Paid</span>
              <span className="font-medium text-padel-teal-dark">
                {confirmedSignups.filter((s) => s.payment_status === "paid").length}/{confirmedSignups.length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-padel-gray-400">Outstanding</span>
              <span className="font-medium text-[#E53935]">
                £{(
                  confirmedSignups.filter((s) => s.payment_status === "unpaid").length * costPerPlayer
                ).toFixed(2)}
              </span>
            </div>
            {user && isOrganiser && (
              <p className="text-xs text-padel-gray-400">
                Tap a player&apos;s payment badge to toggle paid/unpaid.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action buttons — side by side */}
      {user && !isCancelled && (
        <div className="flex gap-3">
          {!isSignedUp ? (
            <>
              <Button
                onClick={handleSignUp}
                disabled={loading}
                className="flex-1 rounded-xl bg-padel-teal text-white hover:bg-padel-teal-dark"
              >
                {booking.status === "full" ? "Join Waitlist" : "Sign Up"}
              </Button>
              <Button
                onClick={handleInterested}
                disabled={loading}
                variant="outline"
                className="flex-1 rounded-xl border-padel-teal text-padel-teal hover:bg-padel-teal hover:text-white"
              >
                Interested
              </Button>
            </>
          ) : (
            <>
              {!isOrganiser && (
                <Button
                  onClick={handleLeave}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 rounded-xl border-padel-teal text-padel-teal hover:bg-padel-teal hover:text-white"
                >
                  Leave Game
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Organiser controls */}
      {isOrganiser && !isCancelled && (
        <div className="flex gap-3">
          <Link href={`/bookings/${booking.id}/edit`} className="flex-1">
            <Button
              variant="outline"
              className="w-full rounded-xl border-padel-teal text-padel-teal hover:bg-padel-teal hover:text-white"
            >
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex-1 rounded-xl">
                Cancel
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will cancel the booking and notify all signed-up
                  players. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel}>
                  Cancel Booking
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Not signed in */}
      {!user && !isCancelled && (
        <div className="rounded-2xl border border-padel-gray-200 bg-white p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <p className="mb-3 text-sm text-padel-gray-400">
            Sign in to join this game
          </p>
          <Link href="/auth/sign-in">
            <Button className="rounded-xl bg-padel-teal text-white hover:bg-padel-teal-dark">Sign In</Button>
          </Link>
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-[#E53935]">{error}</p>
      )}
    </div>
  );
}
