"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function togglePaymentStatus(
  signupId: string,
  bookingId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get current status
  const { data: signup } = await supabase
    .from("signups")
    .select("payment_status, user_id, booking_id")
    .eq("id", signupId)
    .single();

  if (!signup) return { error: "Signup not found" };

  const s = signup as unknown as {
    payment_status: string;
    user_id: string;
    booking_id: string;
  };

  // Check if user is the player or the organiser
  const { data: booking } = await supabase
    .from("bookings")
    .select("organiser_id")
    .eq("id", s.booking_id)
    .single();

  const b = booking as unknown as { organiser_id: string } | null;
  const isPlayer = s.user_id === user.id;
  const isOrganiser = b?.organiser_id === user.id;

  if (!isPlayer && !isOrganiser) {
    return { error: "Not authorized" };
  }

  const newStatus = s.payment_status === "paid" ? "unpaid" : "paid";

  // Use admin client since the user toggling might be the organiser (not the signup owner)
  const admin = createAdminClient();
  const { error } = await admin
    .from("signups")
    .update({ payment_status: newStatus })
    .eq("id", signupId);

  if (error) return { error: error.message };

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/balances");
  return { status: newStatus };
}
