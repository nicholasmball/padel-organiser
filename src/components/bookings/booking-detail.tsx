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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  HelpCircle,
  DollarSign,
} from "lucide-react";
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

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  full: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

const skillColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-blue-100 text-blue-800",
  advanced: "bg-purple-100 text-purple-800",
  pro: "bg-orange-100 text-orange-800",
};

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

  return (
    <div className="space-y-4">
      {/* Main info card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{booking.venue_name}</CardTitle>
              {booking.venue_address && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {booking.venue_address}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {booking.is_outdoor && (
                <Badge variant="outline">Outdoor</Badge>
              )}
              <Badge variant={statusVariant[booking.status] || "secondary"}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(booking.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {confirmedSignups.length}/{booking.max_players} players
              </span>
            </div>
            {booking.total_cost > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>${costPerPlayer.toFixed(2)}/player</span>
              </div>
            )}
          </div>

          {booking.court_number && (
            <p className="text-sm text-muted-foreground">
              Court: {booking.court_number}
            </p>
          )}

          {booking.notes && (
            <>
              <Separator />
              <p className="text-sm">{booking.notes}</p>
            </>
          )}

          {booking.is_outdoor && booking.venue_lat && booking.venue_lng && (
            <>
              <Separator />
              <WeatherBadge
                lat={booking.venue_lat}
                lng={booking.venue_lng}
                date={booking.date}
                isOutdoor={booking.is_outdoor}
              />
            </>
          )}

          <Separator />
          <p className="text-xs text-muted-foreground">
            Organised by {organiserName}
          </p>
        </CardContent>
      </Card>

      {/* Action buttons */}
      {user && !isCancelled && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              {!isSignedUp ? (
                <>
                  <Button
                    onClick={handleSignUp}
                    disabled={loading}
                    className="w-full gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {booking.status === "full" ? "Join Waitlist" : "Sign Up"}
                  </Button>
                  <Button
                    onClick={handleInterested}
                    disabled={loading}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Interested (not sure)
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-center text-sm">
                    You&apos;re{" "}
                    <Badge variant="secondary" className="capitalize">
                      {mySignup.status}
                    </Badge>
                  </p>
                  {!isOrganiser && (
                    <Button
                      onClick={handleLeave}
                      disabled={loading}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <UserMinus className="h-4 w-4" />
                      Leave Game
                    </Button>
                  )}
                </div>
              )}

              {isOrganiser && (
                <div className="mt-2 flex gap-2">
                  <Link href={`/bookings/${booking.id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="flex-1 gap-2">
                        <Trash2 className="h-4 w-4" />
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

              {error && (
                <p className="text-center text-sm text-destructive">{error}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not signed in */}
      {!user && !isCancelled && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Sign in to join this game
            </p>
            <Link href="/auth/sign-in">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Players list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Players ({confirmedSignups.length}/{booking.max_players})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {confirmedSignups.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No players signed up yet.
            </p>
          )}
          {confirmedSignups.map((signup) => (
            <div key={signup.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {signup.profile?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {signup.profile?.full_name || "Unknown"}
                    {signup.user_id === booking.organiser_id && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (organiser)
                      </span>
                    )}
                  </p>
                  {signup.profile?.skill_level && (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${skillColors[signup.profile.skill_level] || ""}`}
                    >
                      {signup.profile.skill_level}
                    </span>
                  )}
                </div>
              </div>
              {booking.total_cost > 0 && (
                <button
                  onClick={async () => {
                    if (!user) return;
                    if (user.id !== signup.user_id && !isOrganiser) return;
                    await togglePaymentStatus(signup.id, booking.id);
                    router.refresh();
                  }}
                  disabled={!user || (user.id !== signup.user_id && !isOrganiser)}
                  className="cursor-pointer disabled:cursor-default"
                >
                  <Badge
                    variant={
                      signup.payment_status === "paid" ? "default" : "outline"
                    }
                    className={`text-xs ${
                      user && (user.id === signup.user_id || isOrganiser)
                        ? "hover:opacity-70"
                        : ""
                    }`}
                  >
                    {signup.payment_status === "paid"
                      ? "Paid"
                      : `Unpaid · $${costPerPlayer.toFixed(2)}`}
                  </Badge>
                </button>
              )}
            </div>
          ))}

          {waitlistSignups.length > 0 && (
            <>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Waitlist
              </p>
              {waitlistSignups.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {signup.profile?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "?"}
                  </div>
                  <span>{signup.profile?.full_name || "Unknown"}</span>
                </div>
              ))}
            </>
          )}

          {interestedSignups.length > 0 && (
            <>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Interested
              </p>
              {interestedSignups.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {signup.profile?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "?"}
                  </div>
                  <span>{signup.profile?.full_name || "Unknown"}</span>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment summary */}
      {booking.total_cost > 0 && confirmedSignups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total cost</span>
              <span className="font-medium">${booking.total_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Per player ({confirmedSignups.length} players)</span>
              <span className="font-medium">${costPerPlayer.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid</span>
              <span className="font-medium text-green-600">
                {confirmedSignups.filter((s) => s.payment_status === "paid").length}/{confirmedSignups.length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className="font-medium text-orange-600">
                ${(
                  confirmedSignups.filter((s) => s.payment_status === "unpaid").length * costPerPlayer
                ).toFixed(2)}
              </span>
            </div>
            {user && isOrganiser && (
              <p className="text-xs text-muted-foreground">
                Tap a player&apos;s payment badge to toggle paid/unpaid.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
