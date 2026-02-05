import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEmailBlacklisted } from "@/lib/actions/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check blacklist
        if (user.email && (await isEmailBlacklisted(user.email))) {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            `${origin}/auth/sign-in?blocked=true`
          );
        }

        // Check if profile exists, create if not
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!profile) {
          await supabase.from("profiles").insert({
            id: user.id,
            full_name: (user.user_metadata.full_name as string) || "New Player",
            email: user.email ?? "",
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error - redirect to sign-in with error
  return NextResponse.redirect(`${origin}/auth/sign-in`);
}
