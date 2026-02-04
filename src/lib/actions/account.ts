"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  // Delete notifications (references profiles)
  await admin.from("notifications").delete().eq("user_id", user.id);

  // Delete profile — cascades to availability, unavailable_dates, signups, comments, and bookings (organiser_id)
  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  // Delete the auth user
  const { error: authError } = await admin.auth.admin.deleteUser(user.id);

  if (authError) return { error: authError.message };

  return { success: true };
}
