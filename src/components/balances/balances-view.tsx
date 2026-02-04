"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Wallet, TrendingUp, TrendingDown } from "lucide-react";

interface Debt {
  from_id: string;
  from_name: string;
  to_id: string;
  to_name: string;
  amount: number;
  booking_id: string;
  venue_name: string;
  date: string;
}

interface Settlement {
  from_id: string;
  from_name: string;
  to_id: string;
  to_name: string;
  amount: number;
}

interface BalancesViewProps {
  currentUserId: string | null;
  debts: Debt[];
  settlements: Settlement[];
  profileMap: Record<string, string>;
}

export function BalancesView({
  currentUserId,
  debts,
  settlements,
  profileMap,
}: BalancesViewProps) {
  // Calculate what the current user owes / is owed
  const iOwe = settlements
    .filter((s) => s.from_id === currentUserId)
    .reduce((sum, s) => sum + s.amount, 0);
  const owedToMe = settlements
    .filter((s) => s.to_id === currentUserId)
    .reduce((sum, s) => sum + s.amount, 0);

  // My individual debts
  const myDebts = debts.filter((d) => d.from_id === currentUserId);
  const owedToMeDebts = debts.filter((d) => d.to_id === currentUserId);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {currentUserId && (
        <>
          {/* My summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingDown className="h-4 w-4" />
                  I owe
                </div>
                <p className="mt-1 text-2xl font-bold text-orange-600">
                  ${iOwe.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Owed to me
                </div>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  ${owedToMe.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* My outstanding payments */}
          {myDebts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">I Need to Pay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {myDebts.map((d, i) => (
                  <div
                    key={`${d.booking_id}-${i}`}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.to_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.venue_name} ·{" "}
                        {new Date(d.date + "T00:00:00").toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short" }
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-orange-600">
                      ${d.amount.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Owed to me */}
          {owedToMeDebts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Owed to Me</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {owedToMeDebts.map((d, i) => (
                  <div
                    key={`${d.booking_id}-${i}`}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.from_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.venue_name} ·{" "}
                        {new Date(d.date + "T00:00:00").toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short" }
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      ${d.amount.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {myDebts.length === 0 && owedToMeDebts.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Wallet className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No outstanding payments.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Settle up suggestions */}
      {settlements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Settle Up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Net balances across all games:
            </p>
            {settlements.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{s.from_name}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{s.to_name}</span>
                </div>
                <span className="text-sm font-bold">
                  ${s.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!currentUserId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Wallet className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Sign in to see your balances.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
