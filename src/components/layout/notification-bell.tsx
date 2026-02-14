"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getUnreadCount } from "@/lib/actions/notifications";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const initialised = useRef(false);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    async function fetchCount() {
      const c = await getUnreadCount();
      initialised.current = true;
      setCount(c);
    }
    fetchCount();

    // Subscribe to realtime changes on notifications table for this user
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setCount((prev) => prev + 1);
          if (initialised.current) {
            toast.info("You have a new notification", { duration: 4000 });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Notification marked as read — refetch count
          getUnreadCount().then((c) => setCount(c));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  return (
    <Link
      href="/notifications"
      className="relative rounded-full p-1.5 hover:bg-accent"
    >
      <Bell
        className={`h-5 w-5 ${count > 0 ? "animate-[bell-ring_0.5s_ease-in-out_infinite_alternate] text-primary" : ""}`}
      />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
