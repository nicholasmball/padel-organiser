"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
import {
  getAvailableMembers,
  addPlayerToBooking,
} from "@/lib/actions/bookings";

interface Member {
  id: string;
  full_name: string;
  skill_level: string | null;
}

interface AddPlayerDialogProps {
  bookingId: string;
}

export function AddPlayerDialog({ bookingId }: AddPlayerDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      setSearch("");
      getAvailableMembers(bookingId).then((result) => {
        if (result.error) {
          setError(result.error);
        } else if (result.members) {
          setMembers(result.members);
        }
        setLoading(false);
      });
    }
  }, [open, bookingId]);

  const filtered = members.filter((m) =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd(userId: string) {
    setAdding(userId);
    setError(null);
    const result = await addPlayerToBooking(bookingId, userId);
    if (result.error) {
      setError(result.error);
      setAdding(null);
    } else {
      // Remove the added member from the list
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      setAdding(null);
      router.refresh();
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const skillColour: Record<string, string> = {
    beginner: "bg-green-100 text-green-700",
    intermediate: "bg-blue-100 text-blue-700",
    advanced: "bg-purple-100 text-purple-700",
    pro: "bg-amber-100 text-amber-700",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-lg border-padel-teal text-padel-teal hover:bg-padel-teal hover:text-white"
        >
          <UserPlus className="h-4 w-4" />
          Add Player
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Player</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg"
        />

        {error && (
          <p className="text-sm text-[#E53935]">{error}</p>
        )}

        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-padel-gray-400">
              Loading members...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-padel-gray-400">
              {search ? "No members match your search" : "No available members to add"}
            </p>
          ) : (
            filtered.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-padel-gray-100/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-padel-teal text-xs font-semibold text-white">
                    {getInitials(member.full_name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-padel-charcoal">
                      {member.full_name}
                    </p>
                    {member.skill_level && (
                      <span
                        className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          skillColour[member.skill_level] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {member.skill_level}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAdd(member.id)}
                  disabled={adding === member.id}
                  className="h-8 rounded-lg bg-padel-teal text-xs text-white hover:bg-padel-teal-dark"
                >
                  {adding === member.id ? "Adding..." : "Add"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
