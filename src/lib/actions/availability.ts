"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { revalidatePath } from "next/cache";

export async function addAvailability(
  dayOfWeek: number,
  startTime: string,
  endTime: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  await ensureProfile(supabase);

  const { error } = await supabase.from("availability").insert({
    user_id: user.id,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/calendar");
  revalidatePath("/members");
  return { success: true };
}

export async function removeAvailability(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("availability")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/calendar");
  revalidatePath("/members");
  return { success: true };
}

export async function addUnavailableDate(date: string, reason?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  await ensureProfile(supabase);

  const { error } = await supabase.from("unavailable_dates").insert({
    user_id: user.id,
    date,
    reason: reason || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/calendar");
  return { success: true };
}

export async function removeUnavailableDate(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("unavailable_dates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/calendar");
  return { success: true };
}
