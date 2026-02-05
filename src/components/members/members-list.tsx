"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MessageCircle } from "lucide-react";

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const skillColors: Record<string, string> = {
  beginner: "bg-[rgba(0,128,128,0.08)] text-padel-teal",
  intermediate: "bg-[rgba(0,128,128,0.12)] text-padel-teal-dark",
  advanced: "bg-[rgba(128,0,128,0.08)] text-purple-700",
  pro: "bg-[rgba(204,255,0,0.2)] text-padel-teal-dark",
};

const SKILL_LEVELS = ["all", "beginner", "intermediate", "advanced", "pro"];
const SKILL_LABELS: Record<string, string> = {
  all: "All",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  pro: "Pro",
};

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  skill_level: string | null;
  created_at: string;
  is_admin?: boolean;
}

interface AvailabilitySlot {
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface MembersListProps {
  profiles: Profile[];
  availability: AvailabilitySlot[];
}

function getWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export function MembersList({ profiles, availability }: MembersListProps) {
  const [search, setSearch] = useState("");
  const [filterSkill, setFilterSkill] = useState<string>("all");

  // Group availability by user
  const availByUser = new Map<string, AvailabilitySlot[]>();
  availability.forEach((a) => {
    const existing = availByUser.get(a.user_id) || [];
    existing.push(a);
    availByUser.set(a.user_id, existing);
  });

  // Filter profiles
  const filtered = profiles.filter((p) => {
    if (
      search &&
      !p.full_name.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (filterSkill !== "all" && p.skill_level !== filterSkill) {
      return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-[480px] space-y-4">
      <p className="text-[13px] text-padel-gray-400">{profiles.length} members</p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-padel-gray-400" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SKILL_LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => setFilterSkill(level)}
            className={`shrink-0 rounded-full border-[1.5px] px-4 py-1.5 text-[13px] font-medium transition-all ${
              filterSkill === level
                ? "border-padel-teal bg-padel-teal text-white"
                : "border-padel-gray-200 bg-white text-padel-gray-400 hover:border-padel-teal/50"
            }`}
          >
            {SKILL_LABELS[level]}
          </button>
        ))}
      </div>

      {/* Members list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-padel-gray-400">
              No members match your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((profile) => {
            const userAvail = availByUser.get(profile.id) || [];
            // Group by day
            const daySlots = new Map<number, AvailabilitySlot[]>();
            userAvail.forEach((a) => {
              const existing = daySlots.get(a.day_of_week) || [];
              existing.push(a);
              daySlots.set(a.day_of_week, existing);
            });

            return (
              <Card key={profile.id}>
                <CardContent className="px-4 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {/* Avatar with ring */}
                      <div className="shrink-0 rounded-full border-2 border-padel-teal p-[2px]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-padel-teal text-xs font-semibold text-white">
                          {profile.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[14px] font-semibold text-padel-charcoal">{profile.full_name}</p>
                          {profile.is_admin && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-padel-lime px-1.5 py-0.5 text-[10px] font-semibold uppercase text-padel-charcoal">
                              🛡️ Admin
                            </span>
                          )}
                        </div>
                        {profile.skill_level && (
                          <span
                            className={`mt-0.5 inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${skillColors[profile.skill_level] || ""}`}
                          >
                            {profile.skill_level}
                          </span>
                        )}
                      </div>
                    </div>
                    {profile.phone && (
                      <a
                        href={getWhatsAppUrl(profile.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button className="flex shrink-0 items-center gap-1 rounded-[10px] border-[1.5px] border-padel-teal px-2.5 py-1.5 text-[11px] font-medium text-padel-teal transition-colors hover:bg-padel-teal hover:text-white">
                          <MessageCircle className="h-3 w-3" />
                          Message
                        </button>
                      </a>
                    )}
                  </div>

                  {userAvail.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs text-padel-gray-400">
                        Preferred playing times
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                          const slots = daySlots.get(dayNum);
                          if (!slots) return null;
                          return slots.map((slot, i) => (
                            <Badge
                              key={`${dayNum}-${i}`}
                              variant="outline"
                              className="text-xs border-padel-gray-200 text-padel-charcoal"
                            >
                              {SHORT_DAYS[dayNum]}{" "}
                              {slot.start_time.slice(0, 5)}-
                              {slot.end_time.slice(0, 5)}
                            </Badge>
                          ));
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
