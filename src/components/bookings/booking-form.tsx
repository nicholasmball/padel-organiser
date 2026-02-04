"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createBooking, updateBooking } from "@/lib/actions/bookings";

interface BookingFormProps {
  mode: "create" | "edit";
  bookingId?: string;
  defaultValues?: {
    venue_name: string;
    venue_address: string;
    court_number: string;
    is_outdoor: boolean;
    date: string;
    start_time: string;
    end_time: string;
    total_cost: number;
    max_players: number;
    notes: string;
  };
}

export function BookingForm({ mode, bookingId, defaultValues }: BookingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [venueName, setVenueName] = useState(defaultValues?.venue_name ?? "");
  const [venueAddress, setVenueAddress] = useState(
    defaultValues?.venue_address ?? ""
  );
  const [courtNumber, setCourtNumber] = useState(
    defaultValues?.court_number ?? ""
  );
  const [isOutdoor, setIsOutdoor] = useState(
    defaultValues?.is_outdoor ?? true
  );
  const [date, setDate] = useState(defaultValues?.date ?? "");
  const [startTime, setStartTime] = useState(
    defaultValues?.start_time ?? ""
  );
  const [endTime, setEndTime] = useState(defaultValues?.end_time ?? "");
  const [totalCost, setTotalCost] = useState(
    defaultValues?.total_cost?.toString() ?? ""
  );
  const [maxPlayers, setMaxPlayers] = useState(
    defaultValues?.max_players?.toString() ?? "4"
  );
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = {
      venue_name: venueName,
      venue_address: venueAddress || undefined,
      court_number: courtNumber || undefined,
      is_outdoor: isOutdoor,
      date,
      start_time: startTime,
      end_time: endTime,
      total_cost: parseFloat(totalCost) || 0,
      max_players: parseInt(maxPlayers) || 4,
      notes: notes || undefined,
    };

    if (mode === "edit" && bookingId) {
      const result = await updateBooking(bookingId, formData);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push(`/bookings/${bookingId}`);
    } else {
      const result = await createBooking(formData);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push(`/bookings/${result.id}`);
    }

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "edit" ? "Edit Booking" : "New Booking"}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venueName">Venue Name *</Label>
            <Input
              id="venueName"
              placeholder="e.g. Padel Club London"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="venueAddress">Address</Label>
            <Input
              id="venueAddress"
              placeholder="123 Court Street, London"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="courtNumber">Court Number</Label>
              <Input
                id="courtNumber"
                placeholder="e.g. Court 3"
                value={courtNumber}
                onChange={(e) => setCourtNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Court Type</Label>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={isOutdoor ? "default" : "outline"}
                  onClick={() => setIsOutdoor(true)}
                  className="flex-1"
                >
                  Outdoor
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!isOutdoor ? "default" : "outline"}
                  onClick={() => setIsOutdoor(false)}
                  className="flex-1"
                >
                  Indoor
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalCost">Total Cost</Label>
              <Input
                id="totalCost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Max Players</Label>
              <Input
                id="maxPlayers"
                type="number"
                min="2"
                max="20"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="e.g. Bring water, parking available"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? mode === "edit"
                ? "Saving..."
                : "Creating..."
              : mode === "edit"
                ? "Save Changes"
                : "Create Booking"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
