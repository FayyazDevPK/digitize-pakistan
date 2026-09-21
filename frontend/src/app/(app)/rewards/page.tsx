"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";

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
  { value: "BANK_TRANSFER", label: "Bank transfer" },
];

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-success-bg text-success border border-success",
  APPROVED: "bg-success-bg text-success border border-success",
  PENDING: "bg-warning-bg text-warning border border-warning",
  REJECTED: "bg-alert/10 text-alert border border-alert",
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

  async function loadWithdrawals() {
    const res = await authFetch("/api/rewards/withdrawals/");
    if (res.ok) setWithdrawals(await res.json());
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
        const body = await res.json().catch(() => ({}));
        setError(body.detail || "Withdrawal failed.");
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

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar tier={user.tier} />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-10 pb-24 md:pb-10">
        <div className="max-w-[620px] bg-paper-raised border border-border-strong rounded-[10px] overflow-hidden">
          <div className="bg-ink px-6 py-6 flex items-end justify-between flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10.5px] tracking-[.14em] text-[#FF7A52]">
                AVAILABLE BALANCE
              </span>
              <span className="font-mono text-[42px] font-semibold text-paper tracking-tight tabular-nums leading-[1.05]">
                {balance.toLocaleString()}
              </span>
              <span className="text-[13px] text-[#C9CCD2]">
                points · ≈ Rs {rupees.toLocaleString()} at 1,000 = Rs 250
              </span>
            </div>
          </div>

          <div className="px-6 py-6 flex flex-col gap-[18px]">
            {!kycApproved && (
              <div className="bg-warning-bg border border-warning rounded-[9px] p-4 flex gap-3 items-start">
                <span className="text-[17px] text-warning">⏳</span>
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-[14.5px] text-[#3E3110]">
                      Withdrawals open once KYC is approved
                    </strong>
                    <span className="bg-[#FFFDF8] text-[#7A5B0F] border border-[#C9A94E] text-[10px] font-semibold px-1.5 py-[3px] rounded">
                      {user.kyc_status}
                    </span>
                  </div>
                  <span className="text-[13px] text-[#5C4A1E] leading-[1.55]">
                    Points keep accruing while you wait — nothing is lost.
                  </span>
                  <button
                    onClick={() => router.push("/kyc")}
                    className="text-[12.5px] font-semibold text-warning text-left"
                  >
                    {user.kyc_status === "NONE" ? "Start verification →" : "View submission →"}
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={handleWithdraw}
              className="bg-white border border-border rounded-[9px] p-[18px] flex flex-col gap-3.5"
            >
              <span className="font-mono text-[10.5px] font-semibold tracking-[.16em]">
                REQUEST A WITHDRAWAL
              </span>
              <div className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-[140px] flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-semibold text-muted">Points to convert</span>
                  <input
                    type="number"
                    min={1}
                    className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] font-mono text-[15px] outline-none focus:border-vermilion"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    disabled={!kycApproved}
                  />
                </div>
                <div className="flex-1 min-w-[140px] flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-semibold text-muted">You receive</span>
                  <div className="bg-[#F5F2EC] border border-border rounded-[7px] px-[13px] py-[11px] font-mono text-[15px] text-muted">
                    Rs {pointsToReceive.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold text-muted">Method</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  disabled={!kycApproved}
                  className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm outline-none focus:border-vermilion"
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-semibold text-muted">Account reference</span>
                <input
                  className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm outline-none focus:border-vermilion"
                  placeholder="0300 1234567"
                  value={accountRef}
                  onChange={(e) => setAccountRef(e.target.value)}
                  disabled={!kycApproved}
                />
              </div>
              <div className="flex items-center justify-between text-[12.5px] text-muted">
                <span>Min Rs 2,000 · paid within 5 working days</span>
              </div>

              {error && <p className="text-alert text-sm">{error}</p>}
              {success && <p className="text-success text-sm">{success}</p>}

              <button
                type="submit"
                disabled={!kycApproved || submitting}
                className={
                  kycApproved
                    ? "bg-vermilion text-white text-[13.5px] font-semibold py-3 rounded-[7px] text-center hover:bg-vermilion-deep transition-colors disabled:opacity-60"
                    : "bg-[#EDE9E1] text-[#9AA0AC] border border-border text-[13.5px] font-semibold py-3 rounded-[7px] text-center cursor-not-allowed"
                }
              >
                {kycApproved
                  ? submitting
                    ? "Requesting…"
                    : "Withdraw"
                  : "Withdraw — locked until KYC approved"}
              </button>
            </form>

            <div className="flex flex-col">
              <div className="font-mono text-[10.5px] font-semibold tracking-[.16em] border-b-2 border-ink pb-[7px] mb-1">
                HISTORY
              </div>
              {withdrawals.length === 0 && (
                <p className="text-sm text-muted py-3">No withdrawals yet.</p>
              )}
              {withdrawals.map((w, i) => (
                <div
                  key={w.id}
                  className={`flex items-center gap-3 py-3 ${
                    i < withdrawals.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[13.5px] font-medium">
                      Withdrawal · {METHODS.find((m) => m.value === w.method)?.label ?? w.method}
                    </span>
                    <span className="font-mono text-[11.5px] text-muted">
                      {new Date(w.requested_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <span className="font-mono text-[13.5px] font-semibold shrink-0">
                    Rs {Number(w.amount_rs).toLocaleString()}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-[3px] rounded w-[74px] text-center shrink-0 ${
                      STATUS_STYLE[w.status] ?? "bg-white border border-border-strong text-muted"
                    }`}
                  >
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
