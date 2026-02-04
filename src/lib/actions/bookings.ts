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

  revalidatePath("/");
  return { id: (data as { id: string }).id };
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
