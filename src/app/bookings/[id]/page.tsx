import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BookingDetail } from "@/components/bookings/booking-detail";
import { CommentsSection } from "@/components/bookings/comments-section";

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

  // Get comments with profiles
  const { data: comments } = await supabase
    .from("comments")
    .select("*")
    .eq("booking_id", id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: true });

  const commentUserIds = [
    ...new Set(
      ((comments as Array<Record<string, unknown>>) || []).map(
        (c) => c.user_id as string
      )
    ),
  ];
  const { data: commentProfiles } = commentUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", commentUserIds)
    : { data: [] };

  const commentProfileMap = new Map(
    ((commentProfiles as Array<Record<string, unknown>>) || []).map((p) => [
      p.id as string,
      { full_name: p.full_name as string },
    ])
  );

  const enrichedComments = (
    (comments as Array<Record<string, unknown>>) || []
  ).map((c) => ({
    id: c.id as string,
    user_id: c.user_id as string,
    content: c.content as string,
    is_pinned: c.is_pinned as boolean,
    created_at: c.created_at as string,
    profile: commentProfileMap.get(c.user_id as string),
  }));

  const b = booking as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-[480px]">
      <BookingDetail
        booking={{
          id: b.id as string,
          organiser_id: b.organiser_id as string,
          venue_name: b.venue_name as string,
          venue_address: b.venue_address as string | null,
          venue_lat: b.venue_lat as number | null,
          venue_lng: b.venue_lng as number | null,
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
      <div className="mt-4">
        <CommentsSection
          bookingId={b.id as string}
          organiserId={b.organiser_id as string}
          comments={enrichedComments}
        />
      </div>
    </div>
  );
}
