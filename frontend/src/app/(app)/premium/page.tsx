"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";

interface SubscriptionRequest {
  id: number;
  method: string;
  transaction_ref: string;
  amount_paid: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string;
}

const METHODS = [
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
];

const STATUS_STYLE: Record<string, string> = {
  APPROVED: "bg-success-bg text-success border border-success",
  PENDING: "bg-warning-bg text-warning border border-warning",
  REJECTED: "bg-alert/10 text-alert border border-alert",
};

export default function PremiumPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [method, setMethod] = useState("EASYPAISA");
  const [transactionRef, setTransactionRef] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadRequests() {
    const res = await authFetch("/api/subscriptions/");
    if (res.ok) setRequests(await res.json());
  }

  useEffect(() => {
    fetchCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      await loadRequests();
      setLoading(false);
    });
  }, [router]);

  const hasPending = requests.some((r) => r.status === "PENDING");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await authFetch("/api/subscriptions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          transaction_ref: transactionRef,
          amount_paid: amountPaid,
        }),
      });
      if (res.ok) {
        setSuccess("Submitted — we'll review it within 1–2 working days.");
        setTransactionRef("");
        setAmountPaid("");
        await loadRequests();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || "Submission failed.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  const isPremium = user.tier === "PREMIUM";

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar tier={user.tier} />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-10 pb-24 md:pb-10">
        <div className="max-w-[620px] flex flex-col gap-5">
          <h1 className="font-display text-3xl">Premium</h1>

          {isPremium ? (
            <div className="bg-premium-bg border border-[#E3D3A8] rounded-[10px] p-5 flex flex-col gap-2">
              <span className="self-start bg-premium text-white text-[10px] font-semibold tracking-[.06em] px-2 py-1 rounded">
                ★ PREMIUM
              </span>
              <span className="font-display text-xl text-[#3E3110]">You&apos;re on Premium</span>
              <span className="text-sm text-[#5C4A1E]">
                {user.tier_expires_at
                  ? `Active until ${new Date(user.tier_expires_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}.`
                  : "Your Premium access is active."}
              </span>
            </div>
          ) : (
            <>
              <div className="bg-paper-raised border border-border-strong rounded-[10px] p-5 flex flex-col gap-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[28px] font-semibold">Rs 950</span>
                  <span className="text-sm text-muted">/month</span>
                </div>
                <ul className="text-sm text-muted flex flex-col gap-1">
                  <li>• 2× read-to-earn rate and higher daily caps</li>
                  <li>• Full access to all learning paths</li>
                  <li>• Eligible for the Creator Program</li>
                  <li>• Priority KYC review</li>
                </ul>
              </div>

              <div className="bg-paper-raised border border-border-strong rounded-[10px] p-5 flex flex-col gap-3.5">
                <span className="font-mono text-[11px] uppercase text-muted">
                  How to pay
                </span>
                <p className="text-sm text-graphite leading-relaxed">
                  Send Rs 950 via JazzCash or Easypaisa to{" "}
                  <span className="font-mono font-semibold text-ink">03XX-XXXXXXX</span>{" "}
                  (Digitize Online SMC (Private) Limited), then submit the transaction reference
                  below. We manually confirm payments — there&apos;s no live merchant integration
                  yet.
                </p>
              </div>

              {hasPending ? (
                <div className="bg-warning-bg border border-warning rounded-[10px] p-5">
                  <span className="text-sm font-semibold text-warning">
                    Your payment is under review.
                  </span>
                  <p className="text-sm text-muted mt-1">
                    We&apos;ll notify you once it&apos;s confirmed. No need to submit again.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="bg-white border border-border rounded-[10px] p-5 flex flex-col gap-3.5"
                >
                  <span className="font-mono text-[11px] font-semibold tracking-[.16em]">
                    SUBMIT PROOF OF PAYMENT
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[12.5px] font-semibold text-muted">Method</span>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
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
                    <span className="text-[12.5px] font-semibold text-muted">
                      Transaction reference
                    </span>
                    <input
                      required
                      className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm font-mono outline-none focus:border-vermilion"
                      placeholder="e.g. TXN12345678"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[12.5px] font-semibold text-muted">Amount paid (Rs)</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm font-mono outline-none focus:border-vermilion"
                      placeholder="950"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                    />
                  </div>

                  {error && <p className="text-alert text-sm">{error}</p>}
                  {success && <p className="text-success text-sm">{success}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="self-start bg-vermilion text-white text-sm font-semibold px-4 py-2.5 rounded-[7px] hover:bg-vermilion-deep transition-colors disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Submit for review"}
                  </button>
                </form>
              )}
            </>
          )}

          {requests.length > 0 && (
            <div className="flex flex-col">
              <div className="font-mono text-[10.5px] font-semibold tracking-[.16em] border-b-2 border-ink pb-[7px] mb-1">
                HISTORY
              </div>
              {requests.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 py-3 ${
                    i < requests.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[13.5px] font-medium">
                      {METHODS.find((m) => m.value === r.method)?.label ?? r.method} ·{" "}
                      {r.transaction_ref}
                    </span>
                    <span className="font-mono text-[11.5px] text-muted">
                      {new Date(r.requested_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {r.status === "REJECTED" && r.rejection_reason && (
                      <span className="text-[12px] text-alert mt-0.5">{r.rejection_reason}</span>
                    )}
                  </div>
                  <span className="font-mono text-[13.5px] font-semibold shrink-0">
                    Rs {Number(r.amount_paid).toLocaleString()}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-[3px] rounded w-[74px] text-center shrink-0 ${
                      STATUS_STYLE[r.status] ?? "bg-white border border-border-strong text-muted"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
