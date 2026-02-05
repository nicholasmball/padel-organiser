import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";
import { WeatherBadge } from "@/components/weather/weather-badge";

interface BookingCardProps {
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

// Design guide badge colors
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

export function BookingCard({
  id,
  venue_name,
  venue_address,
  date,
  start_time,
  end_time,
  total_cost,
  max_players,
  status,
  is_outdoor,
  venue_lat,
  venue_lng,
  confirmed_count,
  organiser_name,
}: BookingCardProps) {
  const costPerPlayer =
    confirmed_count > 0 ? total_cost / confirmed_count : total_cost / max_players;

  // Left border accent per design guide
  const borderAccent =
    status === "open" || status === "confirmed"
      ? "border-l-4 border-l-padel-lime"
      : status === "full"
        ? "border-l-4 border-l-padel-orange"
        : status === "completed" || status === "cancelled"
          ? "border-l-4 border-l-padel-gray-200"
          : "";

  return (
    <Link href={`/bookings/${id}`}>
      <Card className={`transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,128,128,0.08)] ${borderAccent}`}>
        <CardContent className="space-y-2.5 pt-4 pb-4">
          {/* Venue name + address */}
          <div>
            <p className="truncate text-base font-bold text-padel-charcoal">{venue_name}</p>
            {venue_address && (
              <p className="truncate text-xs text-padel-gray-400">{venue_address}</p>
            )}
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${is_outdoor ? "bg-padel-teal/10 text-padel-teal-dark" : "bg-blue-100 text-blue-800"}`}
            >
              {is_outdoor ? "Outdoor" : "Indoor"}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${statusColors[status] || "bg-padel-gray-200 text-padel-gray-400"}`}
            >
              {statusLabel[status] || status}
            </Badge>
            {is_outdoor && venue_lat && venue_lng && (
              <WeatherBadge
                lat={venue_lat}
                lng={venue_lng}
                date={date}
                isOutdoor={is_outdoor}
                compact
              />
            )}
          </div>

          {/* Info line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-padel-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(start_time)} - {formatTime(end_time)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {confirmed_count}/{max_players}
            </span>
            {total_cost > 0 && (
              <span className="font-medium text-padel-charcoal">
                £{costPerPlayer.toFixed(2)}/player
              </span>
            )}
          </div>

          {/* Organiser */}
          <p className="text-xs text-padel-gray-400">
            Organised by {organiser_name}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
