"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search } from "lucide-react";

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const skillColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-blue-100 text-blue-800",
  advanced: "bg-purple-100 text-purple-800",
  pro: "bg-orange-100 text-orange-800",
};

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  skill_level: string | null;
  created_at: string;
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

export function MembersList({ profiles, availability }: MembersListProps) {
  const [search, setSearch] = useState("");
  const [filterDay, setFilterDay] = useState<string>("all");
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
    if (filterDay !== "all") {
      const userAvail = availByUser.get(p.id) || [];
      const hasDay = userAvail.some(
        (a) => a.day_of_week === parseInt(filterDay)
      );
      if (!hasDay) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="h-5 w-5" />
        <span className="text-sm">{profiles.length} members</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDay} onValueChange={setFilterDay}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any day</SelectItem>
            {SHORT_DAYS.map((name, i) => (
              <SelectItem key={i} value={i.toString()}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSkill} onValueChange={setFilterSkill}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any level</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
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
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {profile.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{profile.full_name}</p>
                        {profile.skill_level && (
                          <Badge
                            variant="secondary"
                            className={`mt-0.5 text-xs capitalize ${skillColors[profile.skill_level] || ""}`}
                          >
                            {profile.skill_level}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {userAvail.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                        const slots = daySlots.get(dayNum);
                        if (!slots) return null;
                        return slots.map((slot, i) => (
                          <Badge
                            key={`${dayNum}-${i}`}
                            variant="outline"
                            className="text-xs"
                          >
                            {SHORT_DAYS[dayNum]}{" "}
                            {slot.start_time.slice(0, 5)}-
                            {slot.end_time.slice(0, 5)}
                          </Badge>
                        ));
                      })}
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
