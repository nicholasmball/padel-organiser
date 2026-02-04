import { Card, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";

export default function MyGamesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">My Games</h2>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <History className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Game history coming soon.
          </p>
          <p className="text-sm text-muted-foreground">
            Track your past games, payments, and stats.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
