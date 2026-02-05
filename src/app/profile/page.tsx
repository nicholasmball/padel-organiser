"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteAccount } from "@/lib/actions/account";
import { AvailabilityManager } from "@/components/availability/availability-manager";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [skillLevel, setSkillLevel] = useState<string>("");
  const [availability, setAvailability] = useState<
    Array<{ id: string; day_of_week: number; start_time: string; end_time: string }>
  >([]);
  const [unavailableDates, setUnavailableDates] = useState<
    Array<{ id: string; date: string; reason: string | null }>
  >([]);

  // Stats
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [gamesUpcoming, setGamesUpcoming] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  async function loadAvailability(userId: string) {
    const supabase = createClient();

    const { data: avail } = await supabase
      .from("availability")
      .select("*")
      .eq("user_id", userId)
      .order("day_of_week")
      .order("start_time");

    setAvailability(
      ((avail as Array<Record<string, unknown>>) || []).map((a) => ({
        id: a.id as string,
        day_of_week: a.day_of_week as number,
        start_time: a.start_time as string,
        end_time: a.end_time as string,
      }))
    );

    const { data: unavail } = await supabase
      .from("unavailable_dates")
      .select("*")
      .eq("user_id", userId)
      .order("date");

    setUnavailableDates(
      ((unavail as Array<Record<string, unknown>>) || []).map((u) => ({
        id: u.id as string,
        date: u.date as string,
        reason: u.reason as string | null,
      }))
    );
  }

  async function loadStats(userId: string) {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    // Get all signups for this user
    const { data: signups } = await supabase
      .from("signups")
      .select("booking_id, status, payment_status")
      .eq("user_id", userId)
      .eq("status", "confirmed");

    const signupList = (signups as Array<Record<string, unknown>>) || [];
    const bookingIds = signupList.map((s) => s.booking_id as string);

    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, date, total_cost, max_players, status")
        .in("id", bookingIds);

      const bookingList = (bookings as Array<Record<string, unknown>>) || [];
      let played = 0;
      let upcoming = 0;

      bookingList.forEach((b) => {
        const date = b.date as string;
        const status = b.status as string;
        if (status === "cancelled") return;
        if (date < today) {
          played++;
        } else {
          upcoming++;
        }
      });

      setGamesPlayed(played);
      setGamesUpcoming(upcoming);
    }

    // Count paid signups
    const paidCount = signupList.filter((s) => s.payment_status === "paid").length;
    setTotalPaid(paidCount);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/sign-in");
      return;
    }

    async function loadProfile() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (data) {
        const p = data as unknown as Profile;
        setProfile(p);
        setFullName(p.full_name);
        setPhone(p.phone || "");
        setSkillLevel(p.skill_level || "");
      }

      await loadAvailability(user!.id);
      await loadStats(user!.id);
      setLoading(false);
    }

    loadProfile();
  }, [user, authLoading, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        skill_level: (skillLevel || null) as Profile["skill_level"],
      })
      .eq("id", user.id);

    if (error) {
      setMessage("Failed to save profile.");
    } else {
      setMessage("Profile saved.");
      setShowEditForm(false);
    }
    setSaving(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-padel-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  const initials = fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className="mx-auto max-w-[480px] space-y-6">
      {/* Hero section — centered */}
      <div className="flex flex-col items-center pt-2">
        {/* Avatar with teal ring */}
        <div className="rounded-full border-[3px] border-padel-teal p-[3px]">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-padel-teal text-2xl font-bold text-white">
            {initials}
          </div>
        </div>
        <h2 className="mt-3 text-[22px] font-bold text-padel-charcoal">{fullName || "Your Profile"}</h2>
        <p className="text-sm text-padel-gray-400">{user.email}</p>
        <button
          onClick={() => setShowEditForm(!showEditForm)}
          className="mt-3 rounded-full border-[1.5px] border-padel-teal px-5 py-1.5 text-[13px] font-medium text-padel-teal transition-colors hover:bg-padel-teal hover:text-white"
        >
          {showEditForm ? "Cancel" : "Edit Profile"}
        </button>
      </div>

      {/* Edit form — collapsible */}
      {showEditForm && (
        <div className="rounded-2xl border border-padel-gray-200 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-padel-charcoal">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-padel-charcoal">Phone (optional, for WhatsApp)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+44 7700 900000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skillLevel" className="text-sm font-medium text-padel-charcoal">Skill Level</Label>
              <Select value={skillLevel} onValueChange={setSkillLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {message && (
              <p className="text-sm font-medium text-padel-teal">{message}</p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl border-padel-gray-200 text-padel-gray-400"
                onClick={() => setShowEditForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-padel-teal text-white hover:bg-padel-teal-dark"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Stats row — 3 cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-2xl border border-padel-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <span className="text-xl">🏆</span>
          <span className="mt-1 text-[22px] font-bold text-padel-teal">{gamesPlayed}</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-padel-gray-400">Played</span>
        </div>
        <div className="flex flex-col items-center rounded-2xl border border-padel-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <span className="text-xl">📅</span>
          <span className="mt-1 text-[22px] font-bold text-padel-teal">{gamesUpcoming}</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-padel-gray-400">Upcoming</span>
        </div>
        <div className="flex flex-col items-center rounded-2xl border border-padel-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <span className="text-xl">💷</span>
          <span className="mt-1 text-[22px] font-bold text-padel-teal">{totalPaid}</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-padel-gray-400">Paid</span>
        </div>
      </div>

      {/* Availability */}
      <AvailabilityManager
        availability={availability}
        unavailableDates={unavailableDates}
        onUpdate={() => user && loadAvailability(user.id)}
      />

      {/* Settings card */}
      <div className="overflow-hidden rounded-2xl border border-padel-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <Link
          href="/notifications"
          className="flex items-center justify-between border-b border-padel-gray-200 px-4 py-3.5 transition-colors hover:bg-padel-soft-gray"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🔔</span>
            <span className="text-[14px] font-medium text-padel-charcoal">Notifications</span>
          </div>
          <ChevronRight className="h-4 w-4 text-padel-gray-400" />
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-padel-soft-gray"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🗑️</span>
                <span className="text-[14px] font-medium text-[#E53935]">Delete Account</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#E53935]" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and remove all your
                data from our servers. Any bookings you organised will also be
                deleted. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-[#E53935] text-white hover:bg-[#E53935]/90"
                onClick={async () => {
                  const result = await deleteAccount();
                  if (result.error) {
                    setMessage(`Delete failed: ${result.error}`);
                    return;
                  }
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  router.push("/auth/sign-in");
                }}
              >
                Delete My Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Sign Out button */}
      <button
        onClick={handleSignOut}
        className="w-full rounded-xl border-[1.5px] border-[#E53935] bg-white py-3 text-sm font-semibold text-[#E53935] transition-colors hover:bg-[#E53935]/5"
      >
        Sign Out
      </button>
    </div>
  );
}
