"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Home, Calendar, Users, Wallet, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/members", label: "Members", icon: Users },
  { href: "/balances", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || pathname.startsWith("/auth/")) return null;

  return (
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
      </div>
    </nav>
  );
}
