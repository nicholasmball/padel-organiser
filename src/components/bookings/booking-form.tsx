"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock } from "lucide-react";
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

function formatDateDisplay(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeRange(start: string, end: string) {
  if (!start || !end) return "";
  return `${start.slice(0, 5)} \u2013 ${end.slice(0, 5)}`;
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
    <div className="mx-auto max-w-[480px] space-y-6">
      {/* Header with cancel */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-padel-charcoal">
          {mode === "edit" ? "Edit Booking" : "Create Padel Booking"}
        </h2>
        <Link
          href={mode === "edit" && bookingId ? `/bookings/${bookingId}` : "/"}
          className="text-sm font-medium text-padel-teal"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-[20px] bg-white p-6 shadow-[0_10px_20px_rgba(0,128,128,0.05)]">
        {/* Venue Name */}
        <div className="space-y-1.5">
          <Label htmlFor="venueName" className="text-sm font-medium text-padel-charcoal">
            Venue Name <span className="text-padel-teal">*</span>
          </Label>
          <Input
            id="venueName"
            placeholder="e.g. Padel Club London"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            required
          />
        </div>

        {/* Venue Address */}
        <div className="space-y-1.5">
          <Label htmlFor="venueAddress" className="text-sm font-medium text-padel-charcoal">
            Address
          </Label>
          <Input
            id="venueAddress"
            placeholder="123 Court Street, London"
            value={venueAddress}
            onChange={(e) => setVenueAddress(e.target.value)}
          />
        </div>

        {/* Court Type — segmented control per design guide */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-padel-charcoal">Court Type <span className="text-padel-teal">*</span></Label>
          <div className="flex rounded-lg bg-padel-soft-gray p-1">
            <button
              type="button"
              onClick={() => setIsOutdoor(true)}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all duration-200 ${
                isOutdoor
                  ? "bg-white text-padel-teal shadow-sm"
                  : "text-padel-gray-400 hover:text-padel-charcoal"
              }`}
            >
              Outdoor
            </button>
            <button
              type="button"
              onClick={() => setIsOutdoor(false)}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all duration-200 ${
                !isOutdoor
                  ? "bg-white text-padel-teal shadow-sm"
                  : "text-padel-gray-400 hover:text-padel-charcoal"
              }`}
            >
              Indoor
            </button>
          </div>
        </div>

        {/* Date — with formatted display */}
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-sm font-medium text-padel-charcoal">
            Date <span className="text-padel-teal">*</span>
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          {date && (
            <div className="flex items-center gap-2 rounded-lg bg-padel-soft-gray px-3 py-2 text-sm text-padel-charcoal">
              <Calendar className="h-4 w-4 text-padel-teal" />
              <span>{formatDateDisplay(date)}</span>
            </div>
          )}
        </div>

        {/* Time — with formatted display */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-padel-charcoal">Time <span className="text-padel-teal">*</span></Label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
          {startTime && endTime && (
            <div className="flex items-center gap-2 rounded-lg bg-padel-soft-gray px-3 py-2 text-sm text-padel-charcoal">
              <Clock className="h-4 w-4 text-padel-teal" />
              <span>{formatTimeRange(startTime, endTime)}</span>
            </div>
          )}
        </div>

        {/* Court Number */}
        <div className="space-y-1.5">
          <Label htmlFor="courtNumber" className="text-sm font-medium text-padel-charcoal">
            Court Number
          </Label>
          <Input
            id="courtNumber"
            placeholder="e.g. Court 3"
            value={courtNumber}
            onChange={(e) => setCourtNumber(e.target.value)}
          />
        </div>

        {/* Max Players + Total Cost side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="maxPlayers" className="text-sm font-medium text-padel-charcoal">
              Max Players
            </Label>
            <Input
              id="maxPlayers"
              type="number"
              min="2"
              max="20"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="totalCost" className="text-sm font-medium text-padel-charcoal">
              Total Cost
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-padel-gray-400">
                £
              </span>
              <Input
                id="totalCost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-sm font-medium text-padel-charcoal">
            Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="Any additional info..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-lg border-[1.5px] border-padel-gray-200 focus-visible:border-padel-teal focus-visible:ring-padel-teal/10"
          />
        </div>

        {error && <p className="text-sm text-padel-red">{error}</p>}

        {/* Submit — pill button per design guide */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-padel-teal py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,128,128,0.25)] transition-all duration-200 hover:-translate-y-px hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {loading
            ? mode === "edit"
              ? "Saving..."
              : "Creating..."
            : mode === "edit"
              ? "Save Changes"
              : "Confirm Booking"}
        </button>
      </form>
    </div>
  );
}
