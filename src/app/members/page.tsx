import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function MembersPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Members</h2>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Member list coming soon.
          </p>
          <p className="text-sm text-muted-foreground">
            View all community members, skill levels, and availability.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
