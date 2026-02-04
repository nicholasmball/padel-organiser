"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, CalendarOff } from "lucide-react";
import {
  addAvailability,
  removeAvailability,
  addUnavailableDate,
  removeUnavailableDate,
} from "@/lib/actions/availability";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface UnavailableDateEntry {
  id: string;
  date: string;
  reason: string | null;
}

interface AvailabilityManagerProps {
  availability: AvailabilitySlot[];
  unavailableDates: UnavailableDateEntry[];
}

export function AvailabilityManager({
  availability,
  unavailableDates,
}: AvailabilityManagerProps) {
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [showAddDate, setShowAddDate] = useState(false);
  const [loading, setLoading] = useState(false);

  const [day, setDay] = useState("1");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("21:00");

  const [unavailDate, setUnavailDate] = useState("");
  const [unavailReason, setUnavailReason] = useState("");

  // Group availability by day
  const byDay = new Map<number, AvailabilitySlot[]>();
  availability.forEach((slot) => {
    const existing = byDay.get(slot.day_of_week) || [];
    existing.push(slot);
    byDay.set(slot.day_of_week, existing);
  });

  async function handleAddSlot() {
    setLoading(true);
    await addAvailability(parseInt(day), startTime, endTime);
    setShowAddSlot(false);
    setLoading(false);
  }

  async function handleRemoveSlot(id: string) {
    setLoading(true);
    await removeAvailability(id);
    setLoading(false);
  }

  async function handleAddDate() {
    setLoading(true);
    await addUnavailableDate(unavailDate, unavailReason || undefined);
    setShowAddDate(false);
    setUnavailDate("");
    setUnavailReason("");
    setLoading(false);
  }

  async function handleRemoveDate(id: string) {
    setLoading(true);
    await removeUnavailableDate(id);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Weekly availability */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Weekly Availability</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddSlot(!showAddSlot)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAddSlot && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((name, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddSlot}
                  disabled={loading}
                  className="flex-1"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddSlot(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {availability.length === 0 && !showAddSlot ? (
            <p className="text-sm text-muted-foreground">
              No availability set. Add your regular playing times.
            </p>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                const slots = byDay.get(dayNum);
                if (!slots) return null;
                return (
                  <div key={dayNum} className="flex items-center gap-2">
                    <span className="w-10 text-sm font-medium text-muted-foreground">
                      {SHORT_DAYS[dayNum]}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {slots.map((slot) => (
                        <Badge
                          key={slot.id}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          {slot.start_time.slice(0, 5)} -{" "}
                          {slot.end_time.slice(0, 5)}
                          <button
                            onClick={() => handleRemoveSlot(slot.id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                            disabled={loading}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unavailable dates */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Unavailable Dates</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddDate(!showAddDate)}
              className="gap-1"
            >
              <CalendarOff className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAddDate && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={unavailDate}
                  onChange={(e) => setUnavailDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  placeholder="e.g. On holiday"
                  value={unavailReason}
                  onChange={(e) => setUnavailReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddDate}
                  disabled={loading || !unavailDate}
                  className="flex-1"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddDate(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {unavailableDates.length === 0 && !showAddDate ? (
            <p className="text-sm text-muted-foreground">
              No dates blocked. Add dates when you&apos;re not available.
            </p>
          ) : (
            <div className="space-y-1.5">
              {unavailableDates.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {new Date(entry.date + "T00:00:00").toLocaleDateString(
                        "en-GB",
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </span>
                    {entry.reason && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        - {entry.reason}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveDate(entry.id)}
                    className="rounded-full p-1 hover:bg-muted"
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
