"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import { authFetchErrorMessage } from "@/lib/api-client";
import { isEarningEntry } from "@/lib/ledger";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";
import BalanceOverTimeChart from "@/components/charts/BalanceOverTimeChart";
import EarningsBreakdown from "@/components/charts/EarningsBreakdown";

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

interface Withdrawal {
  id: number;
  points_requested: number;
  amount_rs: string;
  method: string;
  account_ref: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
}

const METHODS = [
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "BANK_TRANSFER", label: "Bank (IBAN)" },
];

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-mint text-primary-deep",
  APPROVED: "bg-mint text-primary-deep",
  PENDING: "bg-[#ECECE6] text-[#454B5C]",
  REJECTED: "bg-alert-bg text-alert",
};

export default function RewardsPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [rewards, setRewards] = useState<BalanceData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const [points, setPoints] = useState("");
  const [method, setMethod] = useState("EASYPAISA");
  const [accountRef, setAccountRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawalsError, setWithdrawalsError] = useState<string | null>(null);

  async function loadWithdrawals() {
    setWithdrawalsError(null);
    const res = await authFetch("/api/rewards/withdrawals/");
    if (res.ok) {
      setWithdrawals(await res.json());
    } else {
      // A failed fetch must never render as "no withdrawals yet" -- that reads as a real,
      // empty history rather than "we couldn't load it."
      setWithdrawalsError(await authFetchErrorMessage(res, "Couldn't load your request history."));
    }
  }

  useEffect(() => {
    fetchCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      const rewardsRes = await authFetch("/api/rewards/balance/");
      if (rewardsRes.ok) setRewards(await rewardsRes.json());
      await loadWithdrawals();
      setLoading(false);
    });
  }, [router]);

  const kycApproved = user?.kyc_status === "APPROVED";

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await authFetch("/api/rewards/withdrawals/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: Number(points), method, account_ref: accountRef }),
      });
      if (res.ok) {
        setSuccess("Withdrawal requested.");
        setPoints("");
        setAccountRef("");
        const balanceRes = await authFetch("/api/rewards/balance/");
        if (balanceRes.ok) setRewards(await balanceRes.json());
        await loadWithdrawals();
      } else {
        setError(await authFetchErrorMessage(res, "Withdrawal failed."));
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  const balance = rewards ? Number(rewards.balance) : 0;
  const rupees = Math.round((balance / 1000) * 250);
  const pointsToReceive = points ? Math.round((Number(points) / 1000) * 250) : 0;
  const pendingWithdrawal = withdrawals.find((w) => w.status === "REQUESTED");
  const entries = rewards?.recent_entries ?? [];
  const lifetimeEarned = entries
    .filter((e) => isEarningEntry(e.type))
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const withdrawnRs = withdrawals
    .filter((w) => w.status === "PAID" || w.status === "APPROVED")
    .reduce((sum, w) => sum + Number(w.amount_rs), 0);

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar
        tier={user.tier}
        kycStatus={user.kyc_status}
        userName={user.display_name || user.username}
      />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-8 pb-24 md:pb-10 flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] tracking-[.12em] text-primary">REWARDS</span>
            <h1 className="font-display text-4xl md:text-5xl leading-none m-0">Your ledger</h1>
          </div>
          <span className="font-mono text-xs bg-white border border-border rounded-xl px-3 py-2.5">
            Rate · 1,000 pts = Rs 250
          </span>
        </div>

        <div className="bg-ink text-white rounded-[22px] p-6 md:p-7 grid grid-cols-2 md:grid-cols-4 gap-6 items-end">
          <div className="flex flex-col gap-2 col-span-2 md:col-span-1">
            <span className="font-mono text-[11px] tracking-[.12em] text-muted-2">AVAILABLE</span>
            <span className="font-mono text-4xl md:text-5xl font-semibold text-marigold tracking-tight">
              {balance.toLocaleString()}
              <span className="text-sm text-muted-2 ml-1.5">pts</span>
            </span>
            <span className="text-sm text-[#C9CFDC]">≈ Rs {rupees.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1.5 border-l border-[#24304A] pl-5">
            <span className="text-xs text-muted-2">Lifetime earned</span>
            <span className="font-mono text-xl font-semibold">
              {lifetimeEarned.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-l border-[#24304A] pl-5">
            <span className="text-xs text-muted-2">Withdrawn</span>
            <span className="font-mono text-xl font-semibold">
              Rs {withdrawnRs.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-l border-[#24304A] pl-5">
            <span className="text-xs text-muted-2">Pending request</span>
            <span className="font-mono text-xl font-semibold text-marigold">
              {pendingWithdrawal ? `Rs ${Number(pendingWithdrawal.amount_rs).toLocaleString()}` : "—"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-[18px]">
          <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-2xl m-0">Balance over time</h3>
              <span className="text-[13px] text-muted">
                Your last {entries.length} ledger entries. Drops are withdrawals.
              </span>
            </div>
            <BalanceOverTimeChart entries={entries} />
          </div>

          <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-2xl m-0">Where it came from</h3>
              <span className="text-[13px] text-muted">
                From your last {entries.length} entries · {lifetimeEarned.toLocaleString()} pts
              </span>
            </div>
            <EarningsBreakdown entries={entries} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_1.4fr] gap-[18px]">
          <form
            onSubmit={handleWithdraw}
            className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-4"
          >
            <div className="flex justify-between items-baseline">
              <h3 className="font-display text-2xl m-0">Withdraw</h3>
              {kycApproved && (
                <span className="text-xs font-semibold bg-mint text-primary-deep px-2.5 py-1.5 rounded-full">
                  ✓ KYC verified
                </span>
              )}
            </div>

            {!kycApproved && (
              <div className="bg-premium-bg rounded-2xl p-4 flex flex-col gap-1.5">
                <strong className="text-sm">Withdrawals open once KYC is approved</strong>
                <span className="text-[13px] text-graphite">
                  Points keep accruing while you wait — nothing is lost.
                </span>
                <button
                  onClick={() => router.push("/kyc")}
                  type="button"
                  className="text-[13px] font-semibold text-premium text-left"
                >
                  {user.kyc_status === "NONE" ? "Start verification →" : "View submission →"}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Method</span>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button
                    type="button"
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    disabled={!kycApproved}
                    className={
                      m.value === method
                        ? "bg-ink text-white text-[13px] font-semibold rounded-[10px] py-2.5 text-center"
                        : "border border-border-strong text-[13px] font-semibold rounded-[10px] py-2.5 text-center disabled:opacity-60"
                    }
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Account reference</span>
              <input
                className="h-[46px] border border-border-strong rounded-[11px] px-3.5 font-mono text-sm outline-none focus:border-primary"
                placeholder="0300 1234567"
                value={accountRef}
                onChange={(e) => setAccountRef(e.target.value)}
                disabled={!kycApproved}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Amount</span>
              <div className="h-[52px] border-[1.5px] border-primary rounded-[11px] flex items-center px-3.5 gap-2.5 focus-within:ring-4 focus-within:ring-mint">
                <input
                  type="number"
                  min={1}
                  className="flex-1 font-mono text-lg font-semibold outline-none min-w-0"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  disabled={!kycApproved}
                  placeholder="8,000"
                />
                <span className="text-xs text-muted-2 shrink-0">pts</span>
                <span className="font-mono text-[15px] font-semibold text-primary shrink-0">
                  = Rs {pointsToReceive.toLocaleString()}
                </span>
              </div>
            </div>

            {error && <p className="text-alert text-sm">{error}</p>}
            {success && <p className="text-primary-deep text-sm">{success}</p>}

            <button
              type="submit"
              disabled={!kycApproved || submitting}
              className={
                kycApproved
                  ? "h-[50px] bg-ink text-white font-semibold text-[15px] rounded-xl disabled:opacity-60"
                  : "h-[50px] bg-paper text-muted-2 border border-border font-semibold text-[15px] rounded-xl cursor-not-allowed"
              }
            >
              {kycApproved
                ? submitting
                  ? "Requesting…"
                  : points
                    ? `Request Rs ${pointsToReceive.toLocaleString()} withdrawal`
                    : "Request withdrawal"
                : "Withdraw — locked until KYC approved"}
            </button>
            <span className="text-xs text-muted-2 leading-[1.5]">
              Processed within 2 working days. Min Rs 2,000.
            </span>
          </form>

          <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col">
            <h3 className="font-display text-2xl mb-3 m-0">Request history</h3>
            {withdrawalsError ? (
              <div className="flex flex-col items-start gap-2 mt-3">
                <p className="text-sm text-alert m-0">{withdrawalsError}</p>
                <button
                  onClick={loadWithdrawals}
                  className="text-sm font-semibold text-primary"
                >
                  Retry
                </button>
              </div>
            ) : withdrawals.length === 0 ? (
              <p className="text-sm text-muted mt-3">No withdrawals yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-[90px_1fr_70px_90px_90px] gap-3 items-center pb-2.5 border-b border-[#EFEEE8]">
                  <span className="font-mono text-[10px] tracking-[.1em] text-muted-2">DATE</span>
                  <span className="font-mono text-[10px] tracking-[.1em] text-muted-2">METHOD</span>
                  <span className="font-mono text-[10px] tracking-[.1em] text-muted-2 text-right">
                    POINTS
                  </span>
                  <span className="font-mono text-[10px] tracking-[.1em] text-muted-2 text-right">
                    AMOUNT
                  </span>
                  <span className="font-mono text-[10px] tracking-[.1em] text-muted-2 text-center">
                    STATUS
                  </span>
                </div>
                {withdrawals.map((w, i) => (
                  <div
                    key={w.id}
                    className={`grid grid-cols-[90px_1fr_70px_90px_90px] gap-3 items-center py-3.5 text-sm ${
                      i > 0 ? "border-t border-[#EFEEE8]" : ""
                    }`}
                  >
                    <span className="font-mono text-xs text-muted">
                      {new Date(w.requested_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="truncate">
                      {METHODS.find((m) => m.value === w.method)?.label ?? w.method}
                    </span>
                    <span className="font-mono text-right text-muted">
                      {w.points_requested.toLocaleString()}
                    </span>
                    <span className="font-mono font-semibold text-right">
                      Rs {Number(w.amount_rs).toLocaleString()}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-full text-center ${
                        STATUS_STYLE[w.status] ?? "bg-paper text-muted"
                      }`}
                    >
                      {w.status === "REQUESTED" ? "Pending" : w.status}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
