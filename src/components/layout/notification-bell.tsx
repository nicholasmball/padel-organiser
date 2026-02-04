"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getUnreadCount } from "@/lib/actions/notifications";

export function NotificationBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const prevCount = useRef(0);

  useEffect(() => {
    if (!user) return;

    async function fetchCount() {
      const c = await getUnreadCount();
      // Show toast if count increased (new notification arrived)
      if (c > prevCount.current && prevCount.current >= 0) {
        const newCount = c - prevCount.current;
        if (prevCount.current > 0) {
          toast.info(
            newCount === 1
              ? "You have a new notification"
              : `You have ${newCount} new notifications`,
            { duration: 4000 }
          );
        }
      }
      prevCount.current = c;
      setCount(c);
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
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
