"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const rec = profile as Record<string, unknown> | null;
  if (!rec || rec.is_admin !== true) throw new Error("Not an admin");

  return { user, admin };
}

export async function isEmailBlacklisted(email: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("blacklist")
    .select("id")
    .eq("email", email.toLowerCase())
    .single();

  return !!data;
}

export async function checkIsAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const rec = profile as Record<string, unknown> | null;
  return rec?.is_admin === true;
}

export async function getAdminData() {
  const { admin } = await requireAdmin();

  const { data: profiles } = await admin
    .from("profiles")
    .select("*")
    .order("full_name");

  const { data: blacklist } = await admin
    .from("blacklist")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    profiles: ((profiles as Array<Record<string, unknown>>) || []).map((p) => ({
      id: p.id as string,
      full_name: p.full_name as string,
      email: p.email as string,
      phone: p.phone as string | null,
      skill_level: p.skill_level as string | null,
      is_admin: p.is_admin as boolean,
      created_at: p.created_at as string,
    })),
    blacklist: ((blacklist as Array<Record<string, unknown>>) || []).map((b) => ({
      id: b.id as string,
      email: b.email as string,
      reason: b.reason as string | null,
      blacklisted_by: b.blacklisted_by as string | null,
      created_at: b.created_at as string,
    })),
  };
}

export async function deleteUser(userId: string) {
  const { admin, user: currentUser } = await requireAdmin();

  if (userId === currentUser.id) {
    return { error: "Cannot delete your own account from admin panel" };
  }

  // Delete notifications first (references profiles)
  await admin.from("notifications").delete().eq("user_id", userId);

  // Delete profile — cascades to availability, unavailable_dates, signups, comments, bookings
  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  // Delete the auth user
  const { error: authError } = await admin.auth.admin.deleteUser(userId);

  if (authError) return { error: authError.message };

  return { success: true };
}

export async function blacklistUser(userId: string, reason?: string) {
  const { admin, user: currentUser } = await requireAdmin();

  if (userId === currentUser.id) {
    return { error: "Cannot blacklist yourself" };
  }

  // Get the user's email first
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  const rec = profile as Record<string, unknown> | null;
  if (!rec) return { error: "User not found" };

  const email = (rec.email as string).toLowerCase();

  // Delete the user's account (notifications → profile → auth user)
  await admin.from("notifications").delete().eq("user_id", userId);

  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) return { error: profileError.message };

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) return { error: authError.message };

  // Add to blacklist
  const { error: blacklistError } = await admin.from("blacklist").insert({
    email,
    reason: reason || null,
    blacklisted_by: currentUser.id,
  });

  if (blacklistError) return { error: blacklistError.message };

  return { success: true };
}

export async function removeFromBlacklist(blacklistId: string) {
  const { admin } = await requireAdmin();

  const { error } = await admin
    .from("blacklist")
    .delete()
    .eq("id", blacklistId);

  if (error) return { error: error.message };

  return { success: true };
}

export async function addToBlacklist(email: string, reason?: string) {
  const { admin, user: currentUser } = await requireAdmin();

  const normalizedEmail = email.toLowerCase();

  const { error } = await admin.from("blacklist").insert({
    email: normalizedEmail,
    reason: reason || null,
    blacklisted_by: currentUser.id,
  });

  if (error) {
    if (error.code === "23505") return { error: "Email is already blacklisted" };
    return { error: error.message };
  }

  return { success: true };
}

export async function toggleAdmin(userId: string, isAdmin: boolean) {
  const { admin, user: currentUser } = await requireAdmin();

  if (userId === currentUser.id) {
    return { error: "Cannot change your own admin status" };
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);

  if (error) return { error: error.message };

  return { success: true };
}
