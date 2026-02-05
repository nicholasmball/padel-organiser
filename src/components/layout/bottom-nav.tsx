"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { checkIsAdmin } from "@/lib/actions/admin";
import {
  Home,
  Calendar,
  Users,
  UserCircle,
  MoreHorizontal,
  PlusCircle,
  History,
  Wallet,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const mainItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/members", label: "Members", icon: Users },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

const moreItems = [
  { href: "/bookings/new", label: "New Booking", icon: PlusCircle },
  { href: "/my-games", label: "My Games", icon: History },
  { href: "/balances", label: "Wallet", icon: Wallet },
];

const adminItem = { href: "/admin", label: "Admin", icon: Shield };

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    checkIsAdmin().then(setIsAdmin);
  }, [user]);

  if (!user || pathname.startsWith("/auth/")) return null;

  const allMoreItems = [...moreItems, ...(isAdmin ? [adminItem] : [])];
  const isMoreActive = allMoreItems.some((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{
          height: "64px",
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(0, 128, 128, 0.08)",
        }}
      >
        <div className="flex h-full items-center justify-around">
          {mainItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                  isActive
                    ? "text-padel-teal"
                    : "text-padel-gray-400 hover:text-padel-teal-dark"
                )}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <div className="h-1 w-1 rounded-full bg-padel-teal" />
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors",
              isMoreActive || open
                ? "text-padel-teal"
                : "text-padel-gray-400 hover:text-padel-teal-dark"
            )}
          >
            <MoreHorizontal className="h-6 w-6" />
            <span className="text-[10px] font-medium">More</span>
            {isMoreActive && (
              <div className="h-1 w-1 rounded-full bg-padel-teal" />
            )}
          </button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-2">
            {allMoreItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-padel-teal/10 text-padel-teal"
                      : "text-padel-charcoal hover:bg-padel-soft-gray"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
