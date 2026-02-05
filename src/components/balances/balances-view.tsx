"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Wallet } from "lucide-react";

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
    <div className="mx-auto max-w-[480px] space-y-4">
      {currentUserId && (
        <>
          {/* Balance hero — 2 boxes side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ background: "rgba(229,57,53,0.06)" }}>
              <div className="mb-1 text-xl">📤</div>
              <p className="text-sm font-medium text-padel-gray-400">I Owe</p>
              <p className="mt-1 text-2xl font-bold text-[#E53935]">
                -£{iOwe.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(204,255,0,0.15)" }}>
              <div className="mb-1 text-xl">📥</div>
              <p className="text-sm font-medium text-padel-gray-400">Owed to Me</p>
              <p className="mt-1 text-2xl font-bold text-padel-teal-dark">
                +£{owedToMe.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Per-member breakdown cards */}
          {settlements.length > 0 && (
            <div className="rounded-2xl border border-padel-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <h3 className="mb-3 text-base font-semibold text-padel-charcoal">Settle Up</h3>
              <p className="mb-3 text-xs text-padel-gray-400">
                Net balances across all games:
              </p>
              <div className="space-y-3">
                {settlements.map((s, i) => {
                  const isMyDebt = s.from_id === currentUserId;
                  const otherName = isMyDebt ? s.to_name : s.from_name;
                  const initials = otherName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const maxAmount = Math.max(...settlements.map((x) => x.amount), 1);
                  const barPercent = Math.min((s.amount / maxAmount) * 100, 100);

                  return (
                    <div key={i} className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        isMyDebt
                          ? "bg-[rgba(229,57,53,0.1)] text-[#E53935]"
                          : "bg-[rgba(204,255,0,0.15)] text-padel-teal-dark"
                      }`}>
                        {initials}
                      </div>
                      {/* Name + bar */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-padel-charcoal">{otherName}</p>
                          <span className={`text-sm font-bold ${
                            isMyDebt ? "text-[#E53935]" : "text-padel-teal-dark"
                          }`}>
                            {isMyDebt ? "-" : "+"}£{s.amount.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[12px] text-padel-gray-400">
                          {s.from_name} → {s.to_name}
                        </p>
                        {/* Balance bar */}
                        <div className="mt-1.5 h-1 w-full rounded-full bg-padel-gray-200">
                          <div
                            className={`h-1 rounded-full ${isMyDebt ? "bg-[#E53935]" : "bg-padel-lime"}`}
                            style={{ width: `${barPercent}%` }}
                          />
                        </div>
                      </div>
                      {/* Settle pill */}
                      <button className="shrink-0 rounded-full bg-padel-lime px-3 py-1 text-[11px] font-semibold text-padel-charcoal transition-colors hover:bg-padel-lime/80">
                        Settle
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transaction history */}
          {(myDebts.length > 0 || owedToMeDebts.length > 0) && (
            <div className="rounded-2xl border border-padel-gray-200 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <h3 className="mb-3 text-base font-semibold text-padel-charcoal">Transaction History</h3>
              <div className="space-y-3">
                {owedToMeDebts.map((d, i) => (
                  <div
                    key={`owed-${d.booking_id}-${i}`}
                    className="flex items-center gap-3"
                  >
                    {/* Type icon — incoming */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(204,255,0,0.15)" }}>
                      <span className="text-sm">📥</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-padel-charcoal">{d.from_name}</p>
                      <p className="text-[12px] text-padel-gray-400">
                        {d.venue_name} &middot;{" "}
                        {new Date(d.date + "T00:00:00").toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short" }
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-padel-teal-dark">
                      +£{d.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                {myDebts.map((d, i) => (
                  <div
                    key={`owe-${d.booking_id}-${i}`}
                    className="flex items-center gap-3"
                  >
                    {/* Type icon — outgoing */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(229,57,53,0.08)" }}>
                      <span className="text-sm">📤</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-padel-charcoal">{d.to_name}</p>
                      <p className="text-[12px] text-padel-gray-400">
                        {d.venue_name} &middot;{" "}
                        {new Date(d.date + "T00:00:00").toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short" }
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[#E53935]">
                      -£{d.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myDebts.length === 0 && owedToMeDebts.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Wallet className="mb-3 h-10 w-10 text-padel-gray-400/50" />
                <p className="text-sm text-padel-gray-400">
                  No outstanding payments.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!currentUserId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Wallet className="mb-3 h-10 w-10 text-padel-gray-400/50" />
            <p className="text-sm text-padel-gray-400">
              Sign in to see your balances.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
