import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const REMINDER_WINDOWS = [
  { type: "reminder_24h", hoursBeforeMin: 23, hoursBeforeMax: 24, label: "24 hours" },
  { type: "reminder_3h", hoursBeforeMin: 2.5, hoursBeforeMax: 3, label: "3 hours" },
] as const;

export async function GET(request: Request) {
  // Verify cron secret in production
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const now = new Date();
  let totalSent = 0;
  const results: Array<{ type: string; bookingId: string; playerCount: number }> = [];

  for (const window of REMINDER_WINDOWS) {
    // Calculate the time window to search
    const windowStart = new Date(now.getTime() + window.hoursBeforeMin * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + window.hoursBeforeMax * 60 * 60 * 1000);

    // Find bookings in active statuses within this window
    // We need bookings where date + start_time falls within [windowStart, windowEnd]
    const startDate = windowStart.toISOString().split("T")[0];
    const endDate = windowEnd.toISOString().split("T")[0];

    const { data: bookings, error: bookingsError } = await admin
      .from("bookings")
      .select("id, venue_name, date, start_time")
      .in("status", ["open", "full", "confirmed"])
      .gte("date", startDate)
      .lte("date", endDate);

    if (bookingsError || !bookings) continue;

    // Filter bookings whose exact start datetime falls within the window
    const matchingBookings = bookings.filter((b) => {
      const bookingStart = new Date(`${b.date}T${b.start_time}`);
      return bookingStart >= windowStart && bookingStart <= windowEnd;
    });

    if (matchingBookings.length === 0) continue;

    const bookingIds = matchingBookings.map((b) => b.id);

    // Check which reminders have already been sent
    const { data: existingNotifications } = await admin
      .from("notifications")
      .select("booking_id")
      .in("booking_id", bookingIds)
      .eq("type", window.type);

    const alreadyNotified = new Set(
      (existingNotifications || []).map((n) => n.booking_id)
    );

    // Process each booking that hasn't been reminded yet
    for (const booking of matchingBookings) {
      if (alreadyNotified.has(booking.id)) continue;

      // Get confirmed signups for this booking
      const { data: signups } = await admin
        .from("signups")
        .select("user_id")
        .eq("booking_id", booking.id)
        .eq("status", "confirmed");

      const userIds = (signups || []).map((s) => s.user_id);
      if (userIds.length === 0) continue;

      // Format time for display (e.g. "18:00" → "6:00 PM")
      const [hours, minutes] = booking.start_time.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const displayHour = hours % 12 || 12;
      const timeStr = `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;

      const title =
        window.type === "reminder_24h"
          ? "Game tomorrow"
          : "Game starting soon";
      const message =
        window.type === "reminder_24h"
          ? `${booking.venue_name} tomorrow at ${timeStr}`
          : `${booking.venue_name} starts in ${window.label} at ${timeStr}`;

      const rows = userIds.map((userId) => ({
        user_id: userId,
        booking_id: booking.id,
        type: window.type,
        title,
        message,
      }));

      const { error: insertError } = await admin.from("notifications").insert(rows);

      if (!insertError) {
        totalSent += userIds.length;
        results.push({
          type: window.type,
          bookingId: booking.id,
          playerCount: userIds.length,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent: totalSent,
    reminders: results,
  });
}
