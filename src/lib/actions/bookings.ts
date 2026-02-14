"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { ensureProfile } from "@/lib/ensure-profile";
import { geocodeAddress } from "@/lib/geocode";
import { createNotification } from "@/lib/actions/notifications";
import type { Database } from "@/lib/types/database";

type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];

export async function getSavedVenues() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { venues: [] };

  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("venue_name, venue_address, court_number, is_outdoor")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  // Deduplicate by venue_name (keep first/most recent)
  const seen = new Set<string>();
  const venues: Array<{
    venue_name: string;
    venue_address: string | null;
    court_number: string | null;
    is_outdoor: boolean;
  }> = [];

  for (const row of (data as Array<Record<string, unknown>>) || []) {
    const name = row.venue_name as string;
    const key = name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      venues.push({
        venue_name: name,
        venue_address: row.venue_address as string | null,
        court_number: row.court_number as string | null,
        is_outdoor: row.is_outdoor as boolean,
      });
    }
  }

  return { venues };
}

export async function createBooking(formData: {
  venue_name: string;
  venue_address?: string;
  court_number?: string;
  is_outdoor: boolean;
  date: string;
  start_time: string;
  end_time: string;
  total_cost: number;
  max_players: number;
  notes?: string;
  signup_deadline?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Validate date is not in the past
  const today = new Date().toISOString().split("T")[0];
  if (formData.date < today) {
    return { error: "Cannot create a booking in the past" };
  }
  if (formData.date === today && formData.start_time) {
    const now = new Date();
    const [h, m] = formData.start_time.split(":").map(Number);
    if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
      return { error: "Start time must be in the future" };
    }
  }

  const profileResult = await ensureProfile(supabase);
  if (profileResult.error) return { error: profileResult.error };

  // Geocode address to get coordinates for weather
  let venue_lat: number | null = null;
  let venue_lng: number | null = null;
  if (formData.venue_address) {
    const coords = await geocodeAddress(formData.venue_address);
    if (coords) {
      venue_lat = coords.lat;
      venue_lng = coords.lng;
    }
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      ...formData,
      organiser_id: user.id,
      venue_address: formData.venue_address || null,
      venue_lat,
      venue_lng,
      court_number: formData.court_number || null,
      notes: formData.notes || null,
      signup_deadline: formData.signup_deadline || null,
    } as BookingInsert)
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Auto sign-up the organiser
  await supabase.from("signups").insert({
    booking_id: (data as { id: string }).id,
    user_id: user.id,
    status: "confirmed",
  });

  const bookingId = (data as { id: string }).id;

  // Notify users whose availability matches this booking
  notifyAvailableUsers({
    bookingId,
    organiserId: user.id,
    date: formData.date,
    startTime: formData.start_time,
    endTime: formData.end_time,
    venueName: formData.venue_name,
  });

  revalidatePath("/");
  return { id: bookingId };
}

export async function updateBooking(
  bookingId: string,
  formData: {
    venue_name: string;
    venue_address?: string;
    court_number?: string;
    is_outdoor: boolean;
    date: string;
    start_time: string;
    end_time: string;
    total_cost: number;
    max_players: number;
    notes?: string;
    signup_deadline?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Validate date is not in the past
  const today = new Date().toISOString().split("T")[0];
  if (formData.date < today) {
    return { error: "Cannot set booking date to the past" };
  }

  // Geocode address to get coordinates for weather
  let venue_lat: number | null = null;
  let venue_lng: number | null = null;
  if (formData.venue_address) {
    const coords = await geocodeAddress(formData.venue_address);
    if (coords) {
      venue_lat = coords.lat;
      venue_lng = coords.lng;
    }
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      ...formData,
      venue_address: formData.venue_address || null,
      venue_lat,
      venue_lng,
      court_number: formData.court_number || null,
      notes: formData.notes || null,
      signup_deadline: formData.signup_deadline || null,
      updated_at: new Date().toISOString(),
    } as BookingUpdate)
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function deleteBooking(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get booking info and signups before cancelling
  const { data: booking } = await supabase
    .from("bookings")
    .select("venue_name")
    .eq("id", bookingId)
    .single();

  const { data: signups } = await supabase
    .from("signups")
    .select("user_id")
    .eq("booking_id", bookingId)
    .neq("user_id", user.id);

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" } as BookingUpdate)
    .eq("id", bookingId);

  if (error) return { error: error.message };

  // Notify all signed-up players
  const venueName = (booking as unknown as { venue_name: string })?.venue_name || "a booking";
  const userIds = ((signups as Array<Record<string, unknown>>) || []).map(
    (s) => s.user_id as string
  );
  if (userIds.length > 0) {
    createNotification({
      userIds,
      bookingId,
      type: "cancelled",
      title: "Booking cancelled",
      message: `${venueName} has been cancelled by the organiser`,
    });
  }

  revalidatePath("/");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function signUpForBooking(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  await ensureProfile(supabase);

  // Get booking details
  const { data: booking } = await supabase
    .from("bookings")
    .select("max_players, status, organiser_id, venue_name")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking not found" };

  const b = booking as unknown as {
    max_players: number;
    status: string;
    organiser_id: string;
    venue_name: string;
  };
  if (b.status === "cancelled") return { error: "Booking is cancelled" };

  // Count confirmed signups
  const { count } = await supabase
    .from("signups")
    .select("*", { count: "exact", head: true })
    .eq("booking_id", bookingId)
    .eq("status", "confirmed");

  const confirmedCount = count ?? 0;
  const isWaitlist = confirmedCount >= b.max_players;

  const { error } = await supabase.from("signups").insert({
    booking_id: bookingId,
    user_id: user.id,
    status: isWaitlist ? "waitlist" : "confirmed",
    position: isWaitlist ? confirmedCount + 1 : null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Already signed up" };
    return { error: error.message };
  }

  // Notify organiser of new signup
  if (b.organiser_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const name = (profile as unknown as { full_name: string })?.full_name || "Someone";
    createNotification({
      userIds: [b.organiser_id],
      bookingId,
      type: "signup",
      title: `${name} signed up`,
      message: `${name} ${isWaitlist ? "joined the waitlist for" : "signed up for"} ${b.venue_name}`,
    });
  }

  // Update booking status if now full
  if (!isWaitlist && confirmedCount + 1 >= b.max_players) {
    await supabase
      .from("bookings")
      .update({ status: "full" } as BookingUpdate)
      .eq("id", bookingId);
  }

  revalidatePath("/");
  revalidatePath(`/bookings/${bookingId}`);
  return { status: isWaitlist ? "waitlist" : "confirmed" };
}

export async function markInterested(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  await ensureProfile(supabase);

  const { error } = await supabase.from("signups").insert({
    booking_id: bookingId,
    user_id: user.id,
    status: "interested",
  });

  if (error) {
    if (error.code === "23505") return { error: "Already signed up" };
    return { error: error.message };
  }

  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function getAvailableMembers(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get all user IDs already signed up for this booking
  const { data: signups } = await supabase
    .from("signups")
    .select("user_id")
    .eq("booking_id", bookingId);

  const signedUpIds = new Set(
    ((signups as Array<Record<string, unknown>>) || []).map(
      (s) => s.user_id as string
    )
  );

  // Get all profiles
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, skill_level")
    .order("full_name", { ascending: true });

  const available = ((profiles as Array<Record<string, unknown>>) || [])
    .filter((p) => !signedUpIds.has(p.id as string))
    .map((p) => ({
      id: p.id as string,
      full_name: p.full_name as string,
      skill_level: p.skill_level as string | null,
    }));

  return { members: available };
}

export async function addPlayerToBooking(bookingId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the current user is the organiser
  const { data: booking } = await supabase
    .from("bookings")
    .select("organiser_id, max_players, status, venue_name")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking not found" };

  const b = booking as unknown as {
    organiser_id: string;
    max_players: number;
    status: string;
    venue_name: string;
  };

  if (b.organiser_id !== user.id) return { error: "Only the organiser can add players" };
  if (b.status === "cancelled") return { error: "Booking is cancelled" };

  // Count confirmed signups
  const admin = createAdminClient();
  const { count } = await admin
    .from("signups")
    .select("*", { count: "exact", head: true })
    .eq("booking_id", bookingId)
    .eq("status", "confirmed");

  const confirmedCount = count ?? 0;
  const isWaitlist = confirmedCount >= b.max_players;

  // Insert signup using admin client (bypasses RLS for cross-user insert)
  const { error } = await admin.from("signups").insert({
    booking_id: bookingId,
    user_id: userId,
    status: isWaitlist ? "waitlist" : "confirmed",
    position: isWaitlist ? confirmedCount + 1 : null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Player is already signed up" };
    return { error: error.message };
  }

  // Notify the added player
  const { data: organiserProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const organiserName =
    (organiserProfile as unknown as { full_name: string })?.full_name || "The organiser";

  createNotification({
    userIds: [userId],
    bookingId,
    type: "signup",
    title: "Added to game",
    message: `${organiserName} added you to ${b.venue_name}`,
  });

  // Update booking status if now full
  if (!isWaitlist && confirmedCount + 1 >= b.max_players) {
    await admin
      .from("bookings")
      .update({ status: "full" } as BookingUpdate)
      .eq("id", bookingId);
  }

  revalidatePath("/");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true, status: isWaitlist ? "waitlist" : "confirmed" };
}

export async function leaveBooking(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check if user was confirmed
  const { data: signup } = await supabase
    .from("signups")
    .select("status")
    .eq("booking_id", bookingId)
    .eq("user_id", user.id)
    .single();

  const wasConfirmed =
    signup && (signup as unknown as { status: string }).status === "confirmed";

  const { error } = await supabase
    .from("signups")
    .delete()
    .eq("booking_id", bookingId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // If user was confirmed, promote from waitlist (use admin client to bypass RLS)
  if (wasConfirmed) {
    const admin = createAdminClient();

    const { data: nextInLine } = await admin
      .from("signups")
      .select("id, user_id")
      .eq("booking_id", bookingId)
      .eq("status", "waitlist")
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (nextInLine) {
      const nxt = nextInLine as unknown as { id: string; user_id: string };
      await admin
        .from("signups")
        .update({ status: "confirmed", position: null })
        .eq("id", nxt.id);

      // Get booking name for notification
      const { data: bkData } = await admin
        .from("bookings")
        .select("venue_name")
        .eq("id", bookingId)
        .single();
      const vName = (bkData as unknown as { venue_name: string })?.venue_name || "a booking";

      createNotification({
        userIds: [nxt.user_id],
        bookingId,
        type: "waitlist_promoted",
        title: "You're in!",
        message: `A spot opened up — you've been confirmed for ${vName}`,
      });
    }

    // Update booking status
    const { count } = await admin
      .from("signups")
      .select("*", { count: "exact", head: true })
      .eq("booking_id", bookingId)
      .eq("status", "confirmed");

    const { data: booking } = await admin
      .from("bookings")
      .select("max_players")
      .eq("id", bookingId)
      .single();

    if (booking) {
      const maxPlayers = (booking as unknown as { max_players: number })
        .max_players;
      const newStatus = (count ?? 0) < maxPlayers ? "open" : "full";
      await admin
        .from("bookings")
        .update({ status: newStatus } as BookingUpdate)
        .eq("id", bookingId);
    }
  }

  revalidatePath("/");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

/**
 * Notify users whose weekly availability overlaps with a newly created booking.
 * Runs async (fire-and-forget) so it doesn't block the booking creation response.
 */
async function notifyAvailableUsers(params: {
  bookingId: string;
  organiserId: string;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
}) {
  try {
    const admin = createAdminClient();
    const bookingDate = new Date(params.date + "T00:00:00");
    const dayOfWeek = bookingDate.getDay(); // 0=Sun, 6=Sat

    // Format date for notification message
    const dateDisplay = bookingDate.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const timeDisplay = `${params.startTime.slice(0, 5)} – ${params.endTime.slice(0, 5)}`;

    // Find users with availability on this day that overlaps the booking time
    const { data: availSlots } = await admin
      .from("availability")
      .select("user_id, start_time, end_time")
      .eq("day_of_week", dayOfWeek);

    if (!availSlots || availSlots.length === 0) return;

    // Filter to overlapping time slots
    const availList = (availSlots as Array<Record<string, unknown>>).filter((slot) => {
      const slotStart = slot.start_time as string;
      const slotEnd = slot.end_time as string;
      // Overlap: slot starts before booking ends AND slot ends after booking starts
      return slotStart < params.endTime && slotEnd > params.startTime;
    });

    const candidateUserIds = [...new Set(availList.map((s) => s.user_id as string))];

    // Exclude the organiser
    const filtered = candidateUserIds.filter((id) => id !== params.organiserId);
    if (filtered.length === 0) return;

    // Exclude users who are unavailable on this specific date
    const { data: unavail } = await admin
      .from("unavailable_dates")
      .select("user_id")
      .eq("date", params.date)
      .in("user_id", filtered);

    const unavailableIds = new Set(
      ((unavail as Array<Record<string, unknown>>) || []).map((u) => u.user_id as string)
    );

    const usersToNotify = filtered.filter((id) => !unavailableIds.has(id));
    if (usersToNotify.length === 0) return;

    await createNotification({
      userIds: usersToNotify,
      bookingId: params.bookingId,
      type: "availability_match",
      title: "New game when you're free!",
      message: `${params.venueName} on ${dateDisplay} at ${timeDisplay} — you're available!`,
    });
  } catch {
    // Silently fail — don't break booking creation if notification fails
  }
}
