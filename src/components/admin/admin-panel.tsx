"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Shield,
  ShieldOff,
  Trash2,
  Ban,
  UserX,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteUser,
  blacklistUser,
  removeFromBlacklist,
  addToBlacklist,
  toggleAdmin,
} from "@/lib/actions/admin";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  skill_level: string | null;
  is_admin: boolean;
  created_at: string;
}

interface BlacklistEntry {
  id: string;
  email: string;
  reason: string | null;
  blacklisted_by: string | null;
  created_at: string;
}

interface AdminPanelProps {
  profiles: Profile[];
  blacklist: BlacklistEntry[];
}

const skillColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-blue-100 text-blue-800",
  advanced: "bg-purple-100 text-purple-800",
  pro: "bg-orange-100 text-orange-800",
};

export function AdminPanel({ profiles, blacklist }: AdminPanelProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [blacklistEmail, setBlacklistEmail] = useState("");
  const [blacklistReason, setBlacklistReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = profiles.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleToggleAdmin(userId: string, makeAdmin: boolean) {
    setBusy(userId);
    const result = await toggleAdmin(userId, makeAdmin);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(makeAdmin ? "User promoted to admin" : "Admin role removed");
      router.refresh();
    }
    setBusy(null);
  }

  async function handleDeleteUser(userId: string) {
    setBusy(userId);
    const result = await deleteUser(userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("User deleted");
      router.refresh();
    }
    setBusy(null);
  }

  async function handleBlacklistUser(userId: string) {
    setBusy(userId);
    const result = await blacklistUser(userId, banReason || undefined);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("User blacklisted");
      setBanReason("");
      router.refresh();
    }
    setBusy(null);
  }

  async function handleRemoveFromBlacklist(id: string) {
    setBusy(id);
    const result = await removeFromBlacklist(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Removed from blacklist");
      router.refresh();
    }
    setBusy(null);
  }

  async function handleAddToBlacklist(e: React.FormEvent) {
    e.preventDefault();
    if (!blacklistEmail.trim()) return;
    setBusy("add-blacklist");
    const result = await addToBlacklist(
      blacklistEmail.trim(),
      blacklistReason.trim() || undefined
    );
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Email added to blacklist");
      setBlacklistEmail("");
      setBlacklistReason("");
      router.refresh();
    }
    setBusy(null);
  }

  return (
    <Tabs defaultValue="members" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="members">
          Members ({profiles.length})
        </TabsTrigger>
        <TabsTrigger value="blacklist">
          Blacklist ({blacklist.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="members" className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No members found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((profile) => (
              <Card key={profile.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {profile.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {profile.full_name}
                          </p>
                          {profile.is_admin && (
                            <Badge variant="default" className="text-xs shrink-0">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {profile.email}
                        </p>
                        {profile.skill_level && (
                          <Badge
                            variant="secondary"
                            className={`mt-1 text-xs capitalize ${skillColors[profile.skill_level] || ""}`}
                          >
                            {profile.skill_level}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleToggleAdmin(profile.id, !profile.is_admin)
                        }
                        disabled={busy === profile.id}
                        title={
                          profile.is_admin ? "Remove admin" : "Make admin"
                        }
                      >
                        {profile.is_admin ? (
                          <ShieldOff className="h-4 w-4" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy === profile.id}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete user?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete{" "}
                              <strong>{profile.full_name}</strong>&apos;s
                              account and all their data (bookings, signups,
                              comments, availability). This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDeleteUser(profile.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy === profile.id}
                            title="Blacklist user"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Blacklist user?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete{" "}
                              <strong>{profile.full_name}</strong>&apos;s
                              account and blacklist their email (
                              {profile.email}). They will not be able to sign
                              up again or sign in.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="px-6 pb-2">
                            <Label htmlFor="ban-reason">
                              Reason (optional)
                            </Label>
                            <Input
                              id="ban-reason"
                              placeholder="e.g. Repeated no-shows"
                              value={banReason}
                              onChange={(e) => setBanReason(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setBanReason("")}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleBlacklistUser(profile.id)}
                            >
                              Blacklist
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="blacklist" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add to Blacklist</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddToBlacklist} className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                placeholder="Email address"
                value={blacklistEmail}
                onChange={(e) => setBlacklistEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Input
                placeholder="Reason (optional)"
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={busy === "add-blacklist"}
                className="gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        {blacklist.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">
                No blacklisted emails.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {blacklist.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex items-center justify-between gap-4 pt-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-destructive shrink-0" />
                      <p className="font-medium truncate">{entry.email}</p>
                    </div>
                    {entry.reason && (
                      <p className="mt-1 text-sm text-muted-foreground truncate">
                        {entry.reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy === entry.id}
                      >
                        Unblock
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Remove from blacklist?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will allow <strong>{entry.email}</strong> to
                          sign up and use the app again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveFromBlacklist(entry.id)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
