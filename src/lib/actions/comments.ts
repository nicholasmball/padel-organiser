"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function addComment(bookingId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!content.trim()) return { error: "Comment cannot be empty" };

  const { error } = await supabase.from("comments").insert({
    booking_id: bookingId,
    user_id: user.id,
    content: content.trim(),
  });

  if (error) return { error: error.message };

  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function updateComment(
  commentId: string,
  bookingId: string,
  content: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!content.trim()) return { error: "Comment cannot be empty" };

  const { error } = await supabase
    .from("comments")
    .update({ content: content.trim() })
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function deleteComment(commentId: string, bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function togglePinComment(
  commentId: string,
  bookingId: string,
  isPinned: boolean
) {
  // Use admin client because the RLS policy for organiser pin
  // uses a subquery that may conflict with the user's own update policy
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify user is the organiser
  const { data: booking } = await supabase
    .from("bookings")
    .select("organiser_id")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking not found" };
  const b = booking as unknown as { organiser_id: string };
  if (b.organiser_id !== user.id) return { error: "Only the organiser can pin comments" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("comments")
    .update({ is_pinned: isPinned })
    .eq("id", commentId);

  if (error) return { error: error.message };

  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}
