"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogIn } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";

const pageTitles: Record<string, string> = {
  "/": "Home",
  "/calendar": "Calendar",
  "/bookings/new": "New Booking",
  "/my-games": "My Padel Games History",
  "/members": "Members",
  "/balances": "Padel Wallet & Balances",
  "/profile": "Profile",
  "/notifications": "Notifications",
  "/auth/sign-in": "Sign In",
  "/auth/sign-up": "Sign Up",
  "/admin": "Admin",
};

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/bookings/")) return "Booking";
  return "Padel Organiser";
}

export function Header() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const title = getTitle(pathname);

  const initials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <header className="sticky top-0 z-40 border-b border-padel-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <h1 className="text-lg font-semibold text-padel-charcoal">{title}</h1>
        {!loading && (
          <div className="flex items-center gap-2">
            {user && !pathname.startsWith("/auth/") ? (
              <>
                <NotificationBell />
                <Link href="/profile">
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback className="bg-padel-teal text-white text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </>
            ) : (
              <Link href="/auth/sign-in">
                <Button variant="outline" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
