"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { markAsRead, markAllAsRead } from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell,
  CheckCheck,
  UserPlus,
  UserMinus,
  MessageSquare,
  XCircle,
  DollarSign,
  ArrowUpFromLine,
} from "lucide-react";

interface Notification {
  id: string;
  booking_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const typeIcons: Record<string, typeof Bell> = {
  signup: UserPlus,
  leave: UserMinus,
  cancelled: XCircle,
  comment: MessageSquare,
  payment: DollarSign,
  waitlist_promoted: ArrowUpFromLine,
};

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/sign-in");
      return;
    }

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(
        ((data as Array<Record<string, unknown>>) || []).map((n) => ({
          id: n.id as string,
          booking_id: n.booking_id as string | null,
          type: n.type as string,
          title: n.title as string,
          message: n.message as string,
          is_read: n.is_read as boolean,
          created_at: n.created_at as string,
        }))
      );
      setLoading(false);
    }

    load();
  }, [user, authLoading, router]);

  async function handleMarkRead(id: string) {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function handleMarkAllRead() {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-padel-gray-400">Loading...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-padel-charcoal">Notifications</h2>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-padel-teal text-padel-teal hover:bg-padel-teal hover:text-white"
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="mb-3 h-10 w-10 text-padel-gray-400/50" />
            <p className="text-sm text-padel-gray-400">
              No notifications yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            const content = (
              <div
                className={`flex gap-3 rounded-2xl border p-3 transition-colors ${
                  n.is_read
                    ? "border-padel-gray-200 bg-white"
                    : "border-padel-teal/20 bg-padel-teal/5"
                }`}
              >
                <div
                  className={`mt-0.5 shrink-0 rounded-full p-1.5 ${
                    n.is_read
                      ? "bg-padel-gray-200/60 text-padel-gray-400"
                      : "bg-padel-teal/10 text-padel-teal"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      n.is_read ? "text-padel-gray-400" : "font-medium text-padel-charcoal"
                    }`}
                  >
                    {n.title}
                  </p>
                  <p className="text-sm text-padel-gray-400">{n.message}</p>
                  <p className="mt-1 text-xs text-padel-gray-400">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMarkRead(n.id);
                    }}
                    className="shrink-0 self-start rounded p-1 text-padel-gray-400 hover:bg-padel-soft-gray hover:text-padel-charcoal"
                    title="Mark as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
              </div>
            );

            if (n.booking_id) {
              return (
                <Link
                  key={n.id}
                  href={`/bookings/${n.booking_id}`}
                  onClick={() => {
                    if (!n.is_read) handleMarkRead(n.id);
                  }}
                >
                  {content}
                </Link>
              );
            }

            return <div key={n.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
