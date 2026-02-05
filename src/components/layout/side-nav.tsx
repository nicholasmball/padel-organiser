"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { checkIsAdmin } from "@/lib/actions/admin";
import {
  Home,
  Calendar,
  PlusCircle,
  Users,
  User,
  Wallet,
  History,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const publicItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
];

const authItems = [
  { href: "/bookings/new", label: "New Booking", icon: PlusCircle },
  { href: "/my-games", label: "My Games", icon: History },
  { href: "/members", label: "Members", icon: Users },
  { href: "/balances", label: "Balances", icon: Wallet },
  { href: "/profile", label: "Profile", icon: User },
];

const adminItem = { href: "/admin", label: "Admin", icon: Shield };

export function SideNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    checkIsAdmin().then(setIsAdmin);
  }, [user]);

  const navItems = [...publicItems, ...authItems, ...(isAdmin ? [adminItem] : [])];

  if (!user || pathname.startsWith("/auth/")) return null;

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          P
        </div>
        <span className="text-lg font-semibold">Padel Organiser</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
