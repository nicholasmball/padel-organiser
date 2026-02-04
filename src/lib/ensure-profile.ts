import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export async function ensureProfile(
  supabase: SupabaseClient<Database>
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      full_name:
        (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "New Player",
      email: user.email ?? "",
    });

    if (error && error.code !== "23505") {
      return { error: error.message };
    }
  }

  return {};
}
