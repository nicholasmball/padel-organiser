import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BookingDetail } from "@/components/bookings/booking-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (!booking) notFound();

  // Get organiser profile
  const { data: organiser } = await supabase
    .from("profiles")
    .select("full_name, skill_level")
    .eq("id", (booking as Record<string, unknown>).organiser_id as string)
    .single();

  // Get signups with profiles
  const { data: signups } = await supabase
    .from("signups")
    .select("*")
    .eq("booking_id", id)
    .order("signed_up_at", { ascending: true });

  // Get profiles for signups
  const signupUserIds = (signups || []).map(
    (s: Record<string, unknown>) => s.user_id as string
  );
  const { data: signupProfiles } = signupUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, skill_level")
        .in("id", signupUserIds)
    : { data: [] };

  const profileMap = new Map(
    ((signupProfiles as Array<Record<string, unknown>>) || []).map((p) => [
      p.id as string,
      p,
    ])
  );

  const enrichedSignups = ((signups as Array<Record<string, unknown>>) || []).map((s) => ({
    id: s.id as string,
    user_id: s.user_id as string,
    status: s.status as string,
    payment_status: s.payment_status as string,
    position: s.position as number | null,
    profile: profileMap.get(s.user_id as string) as {
      full_name: string;
      skill_level: string | null;
    } | undefined,
  }));

  const b = booking as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-2xl">
      <BookingDetail
        booking={{
          id: b.id as string,
          organiser_id: b.organiser_id as string,
          venue_name: b.venue_name as string,
          venue_address: b.venue_address as string | null,
          court_number: b.court_number as string | null,
          is_outdoor: b.is_outdoor as boolean,
          date: b.date as string,
          start_time: b.start_time as string,
          end_time: b.end_time as string,
          total_cost: b.total_cost as number,
          max_players: b.max_players as number,
          notes: b.notes as string | null,
          status: b.status as string,
          signup_deadline: b.signup_deadline as string | null,
        }}
        organiserName={
          (organiser as Record<string, unknown>)?.full_name as string || "Unknown"
        }
        signups={enrichedSignups}
      />
    </div>
  );
}
