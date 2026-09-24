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
  APPROVED: "bg-mint text-primary-deep",
  PENDING: "bg-[#ECECE6] text-[#454B5C]",
  REJECTED: "bg-alert-bg text-alert",
};

const PERKS = [
  "Higher points on every read",
  "All learning paths, incl. Advanced",
  "Priority withdrawal processing",
  "Ad-free reading",
];

export default function PremiumPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [method, setMethod] = useState("EASYPAISA");
  const [transactionRef, setTransactionRef] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [iban, setIban] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
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
      const form = new FormData();
      form.append("method", method);
      form.append("transaction_ref", transactionRef);
      form.append("amount_paid", amountPaid);
      if (iban.trim()) form.append("iban", iban.trim());
      if (receipt) form.append("receipt_file", receipt);
      const res = await authFetch("/api/subscriptions/", { method: "POST", body: form });
      if (res.ok) {
        setSuccess("Submitted — we'll review it within 1–2 working days.");
        setTransactionRef("");
        setAmountPaid("");
        setIban("");
        setReceipt(null);
        await loadRequests();
      } else {
        const body = await res.json().catch(() => ({}));
        const fieldError = body.iban?.[0] ?? body.receipt_file?.[0];
        setError(body.detail || fieldError || "Submission failed.");
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
      <AppSidebar
        tier={user.tier}
        kycStatus={user.kyc_status}
        userName={user.display_name || user.username}
      />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-8 pb-24 md:pb-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] tracking-[.12em] text-premium">PREMIUM</span>
          <h1 className="font-display text-4xl md:text-5xl leading-none m-0">
            Go further, earn faster.
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6">
          <div className="flex flex-col gap-4">
            <div className="bg-marigold rounded-[24px] p-7 flex flex-col gap-4">
              <span className="font-mono text-[11px] font-semibold tracking-[.12em]">
                MONTHLY
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-5xl font-semibold tracking-tight">Rs 950</span>
                <span className="text-sm">/ month</span>
              </div>
              <div className="flex flex-col text-sm">
                {PERKS.map((p, i) => (
                  <div
                    key={p}
                    className={`py-2.5 border-t border-ink/[.18] ${
                      i === PERKS.length - 1 ? "border-b" : ""
                    }`}
                  >
                    {p}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-2.5">
              <span className="font-mono text-[11px] tracking-[.12em] text-muted">PAY TO</span>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Account title</span>
                <span className="font-semibold">Digitize Online SMC (Pvt) Ltd</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">JazzCash / Easypaisa</span>
                <span className="font-mono font-semibold">03XX-XXXXXXX</span>
              </div>
            </div>

            {isPremium && (
              <div className="bg-ink text-white rounded-[22px] p-6 flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold bg-marigold text-ink px-2.5 py-1.5 rounded-full">
                    PREMIUM · ACTIVE
                  </span>
                  {user.tier_expires_at && (
                    <span className="text-[13px] text-[#C9CFDC]">
                      Renews{" "}
                      {new Date(user.tier_expires_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5">
            {!isPremium && (
              <div className="bg-white border border-border rounded-[22px] p-6 md:p-7 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-2xl m-0">Submit payment proof</h3>
                  <span className="text-[13px] text-muted">
                    Transfer Rs 950, then upload the receipt and transaction reference. We activate within
                    one working day.
                  </span>
                </div>

                {hasPending ? (
                  <div className="bg-[#ECECE6] rounded-2xl p-4">
                    <span className="text-sm font-semibold">Your payment is under review.</span>
                    <p className="text-sm text-muted mt-1 m-0">
                      We&apos;ll notify you once it&apos;s confirmed. No need to submit again.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-semibold">Paid via</span>
                        <select
                          value={method}
                          onChange={(e) => setMethod(e.target.value)}
                          className="h-[46px] border border-border-strong rounded-[11px] px-3.5 text-sm outline-none focus:border-primary"
                        >
                          {METHODS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-semibold">Transaction ID</span>
                        <input
                          required
                          className="h-[46px] border border-border-strong rounded-[11px] px-3.5 font-mono text-sm outline-none focus:border-primary"
                          placeholder="TX-88213094"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-semibold">Amount</span>
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-[46px] border border-border-strong rounded-[11px] px-3.5 font-mono text-sm outline-none focus:border-primary"
                          placeholder="950"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-semibold">
                        Your IBAN / account <span className="text-muted-2 font-normal">(optional)</span>
                      </span>
                      <input
                        className="h-[46px] border border-border-strong rounded-[11px] px-3.5 font-mono text-sm outline-none focus:border-primary"
                        placeholder="PK36 SCBL 0000 0011 2345 6702"
                        value={iban}
                        onChange={(e) => setIban(e.target.value)}
                        maxLength={40}
                      />
                      <span className="text-xs text-muted">
                        The account you paid from, so we can match your transfer.
                      </span>
                    </div>

                    <label
                      className={`min-h-[120px] rounded-[14px] border-[1.5px] border-dashed flex flex-col items-center justify-center gap-1.5 text-center px-4 py-4 cursor-pointer ${
                        receipt ? "border-primary bg-[#F3FAF6]" : "border-border-strong"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                        className="sr-only"
                        onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                      />
                      {receipt ? (
                        <>
                          <span className="text-sm font-semibold text-primary-deep">
                            ✓ {receipt.name}
                          </span>
                          <span className="font-mono text-[11px] text-muted">
                            {(receipt.size / (1024 * 1024)).toFixed(1)} MB · click to replace
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-semibold">Upload receipt screenshot</span>
                          <span className="text-xs text-muted">PNG or JPG, up to 5 MB</span>
                        </>
                      )}
                    </label>

                    {error && <p className="text-alert text-sm">{error}</p>}
                    {success && <p className="text-primary-deep text-sm">{success}</p>}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-ink text-white font-semibold text-[15px] px-5 py-3 rounded-xl disabled:opacity-60"
                      >
                        {submitting ? "Submitting…" : "Submit for activation"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col">
              <h3 className="font-display text-xl mb-3 m-0">Request history</h3>
              {requests.length === 0 && (
                <p className="text-sm text-muted mt-3">No requests yet.</p>
              )}
              {requests.map((r, i) => (
                <div
                  key={r.id}
                  className={`grid grid-cols-[110px_minmax(0,1fr)_90px_auto] gap-3 items-center py-3.5 ${
                    i > 0 ? "border-t border-[#EFEEE8]" : ""
                  } text-sm`}
                >
                  <span className="font-mono text-xs text-muted">
                    {new Date(r.requested_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="truncate">
                    {METHODS.find((m) => m.value === r.method)?.label ?? r.method} ·{" "}
                    {r.transaction_ref}
                  </span>
                  <span className="font-mono font-semibold text-right">
                    Rs {Number(r.amount_paid).toLocaleString()}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-full text-center shrink-0 ${
                      STATUS_STYLE[r.status] ?? "bg-paper text-muted"
                    }`}
                  >
                    {r.status === "PENDING" ? "In review" : r.status}
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
