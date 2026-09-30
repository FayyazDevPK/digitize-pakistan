"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";
import { isEarningEntry, ledgerStyle } from "@/lib/ledger";

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

interface ReferralsData {
  referral_code: string;
  referrals: {
    id: number;
    referred_username: string;
    status: string;
    created_at: string;
  }[];
}

interface LearningPathSummary {
  id: number;
  title: string;
  slug: string;
  access_tier: string;
  milestone_count: number;
  completed_count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [rewards, setRewards] = useState<BalanceData | null>(null);
  const [referrals, setReferrals] = useState<ReferralsData | null>(null);
  const [paths, setPaths] = useState<LearningPathSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [resend, setResend] = useState<{
    state: "idle" | "sending" | "sent" | "error";
    msg?: string;
  }>({
    state: "idle",
  });

  useEffect(() => {
    fetchCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      // No login-history field exists yet, so account age is the closest available proxy for
      // "this is (effectively) their first visit" -- avoids "Welcome back" on a brand-new account.
      setIsNewUser(Date.now() - new Date(u.date_joined).getTime() < 24 * 60 * 60 * 1000);
      const [rewardsRes, referralsRes, pathsRes] = await Promise.all([
        authFetch("/api/rewards/balance/"),
        authFetch("/api/referrals/"),
        authFetch("/api/learning-paths/"),
      ]);
      if (rewardsRes.ok) setRewards(await rewardsRes.json());
      if (referralsRes.ok) setReferrals(await referralsRes.json());
      if (pathsRes.ok) setPaths(await pathsRes.json());
      setLoading(false);
    });
  }, [router]);

  async function resendVerification() {
    setResend({ state: "sending" });
    const res = await authFetch("/api/verify-email/resend/", {
      method: "POST",
    });
    if (res.ok) {
      setResend({ state: "sent" });
    } else if (res.status === 429) {
      setResend({
        state: "error",
        msg: "Too many requests — try again in an hour.",
      });
    } else {
      setResend({ state: "error", msg: "Couldn't send. Please try again." });
    }
  }

  function copyReferral() {
    if (!referrals) return;
    navigator.clipboard.writeText(referrals.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading)
    return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  const points = rewards ? Number(rewards.balance) : 0;
  const rupees =
    Math.floor(points / 1000) * 250 +
    Math.round(((points % 1000) / 1000) * 250);
  const weekGain =
    rewards?.recent_entries
      .filter((e) => isEarningEntry(e.type))
      .reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar
        tier={user.tier}
        kycStatus={user.kyc_status}
        userName={user.display_name || user.username}
      />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-8 pb-24 md:pb-10 flex flex-col gap-6">
        {!user.email_verified && (
          <div className="bg-premium-bg border border-[#F2D68A] rounded-2xl px-5 py-4 flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[220px] flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-premium">
                Verify your email
              </span>
              <span className="text-[13px] text-premium">
                {resend.state === "sent"
                  ? `Verification email sent to ${user.email}. Check your inbox.`
                  : "Referral bonuses only count once your email is verified. We sent a link when you signed up."}
              </span>
              {resend.state === "error" && (
                <span className="text-[13px] text-alert">{resend.msg}</span>
              )}
            </div>
            {resend.state !== "sent" && (
              <button
                onClick={resendVerification}
                disabled={resend.state === "sending"}
                className="bg-ink text-white text-[13px] font-semibold px-4 py-2.5 rounded-[10px] disabled:opacity-60"
              >
                {resend.state === "sending"
                  ? "Sending…"
                  : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col gap-1 flex-1">
            <h1 className="font-display text-4xl md:text-5xl leading-none m-0">
              {isNewUser ? "Welcome" : "Welcome back"}, {user.display_name || user.username}.
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="border border-border-strong text-muted text-[10px] font-semibold tracking-[.06em] px-[7px] py-[3px] rounded">
              {user.tier}
            </span>
            {user.kyc_status !== "APPROVED" && (
              <span className="inline-flex items-center gap-1 bg-premium-bg text-premium border border-premium text-[10.5px] font-semibold px-2 py-[3px] rounded">
                ⏳ KYC {user.kyc_status}
              </span>
            )}
            {user.is_verified_badge && (
              <span className="inline-flex items-center gap-1 bg-verified-bg text-verified border border-verified text-[10px] font-semibold tracking-[.06em] px-[7px] py-[2px] rounded-full">
                ✓ VERIFIED
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr_1fr] gap-4">
          <div className="bg-ink rounded-[22px] p-6 text-white flex flex-col gap-4">
            <div className="flex justify-between">
              <span className="font-mono text-[11px] tracking-[.12em] text-muted-2">
                POINTS BALANCE
              </span>
              {user.kyc_status === "APPROVED" && (
                <span className="text-xs text-primary-light">
                  ● KYC verified
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-5xl font-semibold text-marigold tracking-tight">
                {points.toLocaleString()}
              </span>
              <span className="text-[15px] text-muted-2">pts</span>
            </div>
            <span className="text-sm text-[#C9CFDC]">
              ≈{" "}
              <span className="font-mono text-white">
                Rs {rupees.toLocaleString()}
              </span>{" "}
              at Rs 250 / 1,000
            </span>
            <div className="flex gap-2.5">
              <button
                onClick={() => router.push("/rewards")}
                className="flex-1 bg-primary-light text-ink font-bold text-sm py-3 rounded-xl"
              >
                Withdraw
              </button>
              <button
                onClick={() => router.push("/rewards")}
                className="bg-ink-raised border border-[#24304A] font-semibold text-sm px-4 rounded-xl"
              >
                Ledger
              </button>
            </div>
          </div>

          <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-3.5">
            <span className="font-mono text-[11px] tracking-[.12em] text-muted">
              THIS WEEK
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[34px] font-semibold">
                +{weekGain.toLocaleString()}
              </span>
              <span className="text-[13px] text-muted">pts</span>
            </div>
            <span className="text-[13px] text-primary-deep font-semibold">
              Recent earning activity
            </span>
          </div>

          <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-3.5">
            <span className="font-mono text-[11px] tracking-[.12em] text-muted">
              REFERRALS
            </span>
            <div className="flex gap-4 items-baseline">
              <div>
                <span className="font-mono text-[34px] font-semibold">
                  {referrals?.referrals.length ?? 0}
                </span>
                <span className="text-[13px] text-muted"> invited</span>
              </div>
            </div>
            {referrals && (
              <button
                onClick={copyReferral}
                className="mt-auto flex items-center justify-between border border-dashed border-iris bg-[#F4F4FD] rounded-[11px] px-3 py-2"
              >
                <span className="font-mono text-sm font-semibold">
                  {referrals.referral_code}
                </span>
                <span className="bg-iris text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg">
                  {copied ? "Copied" : "Copy link"}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-[18px]">
          <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-1">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-display text-2xl m-0">Keep learning</h3>
              <button
                onClick={() => router.push("/my-learning")}
                className="text-[13px] font-semibold"
              >
                All paths →
              </button>
            </div>
            {paths.length === 0 && (
              <p className="text-sm text-muted">No learning paths yet.</p>
            )}
            {paths.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/learning-paths/${p.slug}`)}
                className="flex flex-col gap-2 py-3.5 border-t border-[#EFEEE8] text-left"
              >
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">
                    {p.access_tier === "PREMIUM" && (
                      <span className="text-premium font-semibold mr-1">★</span>
                    )}
                    {p.title}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {p.completed_count}/{p.milestone_count} lessons
                  </span>
                </div>
                <div className="h-1.5 bg-[#EFEEE8] rounded-[3px] overflow-hidden">
                  <div
                    className="h-1.5 bg-primary rounded-[3px]"
                    style={{
                      width: `${
                        p.milestone_count > 0
                          ? Math.round(
                              (p.completed_count / p.milestone_count) * 100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-display text-2xl m-0">Recent activity</h3>
              <button
                onClick={() => router.push("/rewards")}
                className="text-[13px] font-semibold"
              >
                Full ledger →
              </button>
            </div>
            {rewards && rewards.recent_entries.length > 0 ? (
              rewards.recent_entries.map((e) => {
                const isNegative = Number(e.amount) < 0;
                const style = ledgerStyle(e.type);
                return (
                  <div
                    key={e.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] sm:grid-cols-[110px_minmax(0,1fr)_auto] gap-3 items-center py-3 border-t border-[#EFEEE8]"
                  >
                    <span className="font-mono text-[11px] text-muted-2 hidden sm:inline">
                      {new Date(e.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                    <span className="text-sm truncate">
                      {e.source_content_title || style.label}
                    </span>
                    <span
                      className="font-mono text-[10px] font-semibold px-[7px] py-[5px] rounded-md hidden sm:inline shrink-0"
                      style={{ background: style.bg, color: style.text }}
                    >
                      {e.type}
                    </span>
                    <span
                      className={`font-mono font-semibold text-sm shrink-0 ${
                        isNegative ? "text-alert" : "text-primary"
                      }`}
                    >
                      {isNegative ? "" : "+"}
                      {e.amount}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted">No activity yet.</p>
            )}
          </div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
