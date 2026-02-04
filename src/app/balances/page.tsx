import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function BalancesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Balances</h2>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Wallet className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Balance tracking coming in Phase 5.
          </p>
          <p className="text-sm text-muted-foreground">
            See who owes whom and settle up easily.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
