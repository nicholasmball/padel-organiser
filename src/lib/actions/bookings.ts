"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { ensureProfile } from "@/lib/ensure-profile";
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

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      ...formData,
      organiser_id: user.id,
      venue_address: formData.venue_address || null,
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

  const { error } = await supabase
    .from("bookings")
    .update({
      ...formData,
      venue_address: formData.venue_address || null,
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

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" } as BookingUpdate)
    .eq("id", bookingId);

  if (error) return { error: error.message };

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
    .select("max_players, status")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking not found" };

  const b = booking as unknown as { max_players: number; status: string };
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
      await admin
        .from("signups")
        .update({ status: "confirmed", position: null })
        .eq("id", (nextInLine as unknown as { id: string }).id);
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
