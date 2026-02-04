"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { BookingForm } from "@/components/bookings/booking-form";

export default function EditBookingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/sign-in");
      return;
    }

    async function loadBooking() {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (!data) {
        router.push("/");
        return;
      }

      const b = data as Record<string, unknown>;

      // Only organiser can edit
      if (b.organiser_id !== user!.id) {
        router.push(`/bookings/${bookingId}`);
        return;
      }

      setBooking(b);
      setLoading(false);
    }

    loadBooking();
  }, [user, authLoading, bookingId, router]);

  if (authLoading || loading || !booking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BookingForm
        mode="edit"
        bookingId={bookingId}
        defaultValues={{
          venue_name: booking.venue_name as string,
          venue_address: (booking.venue_address as string) || "",
          court_number: (booking.court_number as string) || "",
          is_outdoor: booking.is_outdoor as boolean,
          date: booking.date as string,
          start_time: (booking.start_time as string).slice(0, 5),
          end_time: (booking.end_time as string).slice(0, 5),
          total_cost: booking.total_cost as number,
          max_players: booking.max_players as number,
          notes: (booking.notes as string) || "",
        }}
      />
    </div>
  );
}
