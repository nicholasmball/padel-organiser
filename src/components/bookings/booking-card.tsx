import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users } from "lucide-react";

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
  confirmed_count: number;
  organiser_name: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  full: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
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
  confirmed_count,
  organiser_name,
}: BookingCardProps) {
  const costPerPlayer =
    confirmed_count > 0 ? total_cost / confirmed_count : total_cost / max_players;

  return (
    <Link href={`/bookings/${id}`}>
      <Card className="transition-colors hover:bg-accent/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">{venue_name}</CardTitle>
              {venue_address && (
                <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {venue_address}
                </p>
              )}
            </div>
            <div className="ml-2 flex items-center gap-1.5">
              {is_outdoor && (
                <Badge variant="outline" className="text-xs">
                  Outdoor
                </Badge>
              )}
              <Badge variant={statusVariant[status] || "secondary"}>
                {statusLabel[status] || status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {formatDate(date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {formatTime(start_time)} - {formatTime(end_time)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {confirmed_count}/{max_players} players
              </span>
            </div>
            {total_cost > 0 && (
              <span className="text-sm font-medium">
                ${costPerPlayer.toFixed(2)}/player
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Organised by {organiser_name}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
