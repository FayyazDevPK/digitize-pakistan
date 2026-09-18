"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, clearTokens, CurrentUser } from "@/lib/auth";

interface LedgerEntry {
  id: number;
  type: string;
  amount: string;
  balance_after: string;
  source_content_title: string | null;
  status: string;
  created_at: string;
}

interface BalanceData {
  balance: string;
  recent_entries: LedgerEntry[];
}

const TIER_BADGE: Record<string, string> = {
  PREMIUM: "bg-premium text-white",
  FREE: "bg-white border border-border-strong text-muted",
};

const KYC_BADGE: Record<string, string> = {
  APPROVED: "bg-success-bg text-success border border-success",
  PENDING: "bg-white border border-dashed border-border-strong text-muted",
  NONE: "bg-white border border-dashed border-border-strong text-muted",
  REJECTED: "bg-alert/10 text-alert border border-alert",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [rewards, setRewards] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      const res = await authFetch("/api/rewards/balance/");
      if (res.ok) {
        setRewards(await res.json());
      }
      setLoading(false);
    });
  }, [router]);

  function handleLogout() {
    clearTokens();
    router.replace("/login");
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto mt-16 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl">Dashboard</h1>
          <p className="text-muted text-sm mt-1">Welcome, {user.username}</p>
        </div>
        <button
          onClick={handleLogout}
          className="font-mono text-xs border border-border-strong rounded-sm px-3 py-1.5 hover:bg-paper-raised transition-colors"
        >
          Log out
        </button>
      </div>

      <div className="flex gap-2 mb-8">
        <span className={`font-mono text-[11px] px-2.5 py-1 rounded-sm ${TIER_BADGE[user.tier] ?? TIER_BADGE.FREE}`}>
          {user.tier === "PREMIUM" ? "★ PREMIUM" : "FREE"}
        </span>
        <span className={`font-mono text-[11px] px-2.5 py-1 rounded-sm ${KYC_BADGE[user.kyc_status] ?? KYC_BADGE.NONE}`}>
          KYC · {user.kyc_status}
        </span>
        {user.is_verified_badge && (
          <span className="font-mono text-[11px] px-2.5 py-1 rounded-sm bg-verified-bg text-verified border border-verified">
            ✓ VERIFIED
          </span>
        )}
      </div>

      {rewards && (
        <div className="bg-paper-raised border border-border rounded-md overflow-hidden">
          <div className="p-5 border-b border-border-strong">
            <div className="font-mono text-[11px] uppercase text-muted">Rewards balance</div>
            <div className="font-mono text-3xl font-semibold mt-1">{rewards.balance} pts</div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase text-muted px-5 pt-4 pb-2">
              Recent activity
            </div>
            {rewards.recent_entries.map((e) => {
              const isNegative = Number(e.amount) < 0;
              return (
                <div
                  key={e.id}
                  className="flex justify-between items-center px-5 py-2.5 border-t border-border text-sm"
                >
                  <span className="text-ink/80">
                    {e.type}
                    {e.source_content_title && (
                      <span className="text-muted"> — {e.source_content_title}</span>
                    )}
                  </span>
                  <span
                    className={`font-mono shrink-0 ml-4 ${isNegative ? "text-alert" : "text-success"}`}
                  >
                    {isNegative ? "" : "+"}
                    {e.amount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
