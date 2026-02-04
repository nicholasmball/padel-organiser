import { createClient } from "@/lib/supabase/server";
import { BalancesView } from "@/components/balances/balances-view";

export const dynamic = "force-dynamic";

export default async function BalancesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get all completed/confirmed bookings with their signups
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .in("status", ["open", "full", "confirmed", "completed"])
    .order("date", { ascending: false });

  const allBookings = (bookings as Array<Record<string, unknown>>) || [];
  const bookingIds = allBookings.map((b) => b.id as string);

  const { data: signups } = bookingIds.length
    ? await supabase
        .from("signups")
        .select("*")
        .in("booking_id", bookingIds)
        .eq("status", "confirmed")
    : { data: [] };

  const allSignups = (signups as Array<Record<string, unknown>>) || [];

  // Get all profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name");

  const profileMap = new Map(
    ((profiles as Array<Record<string, unknown>>) || []).map((p) => [
      p.id as string,
      p.full_name as string,
    ])
  );

  // Calculate balances: for each booking, each unpaid player owes the organiser their share
  const debts: Array<{
    from_id: string;
    to_id: string;
    amount: number;
    booking_id: string;
    venue_name: string;
    date: string;
  }> = [];

  const bookingMap = new Map(
    allBookings.map((b) => [b.id as string, b])
  );

  allSignups.forEach((s) => {
    const booking = bookingMap.get(s.booking_id as string);
    if (!booking) return;

    const totalCost = booking.total_cost as number;
    if (totalCost <= 0) return;

    const organiserId = booking.organiser_id as string;
    const userId = s.user_id as string;

    // Skip organiser's own signup
    if (userId === organiserId) return;

    // Count confirmed signups for this booking
    const bookingSignups = allSignups.filter(
      (x) => x.booking_id === booking.id && x.status === "confirmed"
    );
    const costPerPlayer = totalCost / bookingSignups.length;

    if ((s.payment_status as string) === "unpaid") {
      debts.push({
        from_id: userId,
        to_id: organiserId,
        amount: costPerPlayer,
        booking_id: booking.id as string,
        venue_name: booking.venue_name as string,
        date: booking.date as string,
      });
    }
  });

  // Net balances between pairs
  const netBalances = new Map<string, number>();
  debts.forEach((d) => {
    // Key: sorted pair so A->B and B->A net out
    const key =
      d.from_id < d.to_id
        ? `${d.from_id}:${d.to_id}`
        : `${d.to_id}:${d.from_id}`;
    const direction = d.from_id < d.to_id ? 1 : -1;
    netBalances.set(
      key,
      (netBalances.get(key) || 0) + d.amount * direction
    );
  });

  const settlements: Array<{
    from_id: string;
    from_name: string;
    to_id: string;
    to_name: string;
    amount: number;
  }> = [];

  netBalances.forEach((amount, key) => {
    if (Math.abs(amount) < 0.01) return;
    const [id1, id2] = key.split(":");
    const fromId = amount > 0 ? id1 : id2;
    const toId = amount > 0 ? id2 : id1;
    settlements.push({
      from_id: fromId,
      from_name: profileMap.get(fromId) || "Unknown",
      to_id: toId,
      to_name: profileMap.get(toId) || "Unknown",
      amount: Math.abs(amount),
    });
  });

  // Sort by amount descending
  settlements.sort((a, b) => b.amount - a.amount);

  return (
    <BalancesView
      currentUserId={user?.id || null}
      debts={debts.map((d) => ({
        ...d,
        from_name: profileMap.get(d.from_id) || "Unknown",
        to_name: profileMap.get(d.to_id) || "Unknown",
      }))}
      settlements={settlements}
      profileMap={Object.fromEntries(profileMap)}
    />
  );
}
