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

interface ReferralsData {
  referral_code: string;
  referrals: { id: number; referred_username: string; status: string; created_at: string }[];
}

interface LearningPathSummary {
  id: number;
  title: string;
  slug: string;
  access_tier: string;
  milestone_count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [rewards, setRewards] = useState<BalanceData | null>(null);
  const [referrals, setReferrals] = useState<ReferralsData | null>(null);
  const [paths, setPaths] = useState<LearningPathSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
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

  function copyReferral() {
    if (!referrals) return;
    navigator.clipboard.writeText(referrals.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  const points = rewards ? Number(rewards.balance) : 0;
  const rupees = Math.floor(points / 1000) * 250 + Math.round(((points % 1000) / 1000) * 250);
  const activeReferrals = referrals?.referrals.filter((r) => r.status !== "PENDING").length ?? 0;
  const pendingReferrals = referrals?.referrals.filter((r) => r.status === "PENDING").length ?? 0;

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar tier={user.tier} />

      <div className="flex-1 min-w-0 px-6 md:px-[26px] py-6 md:py-[30px] pb-24 md:pb-[30px] flex flex-col gap-[22px]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex flex-col gap-[5px]">
            <h1 className="font-display text-[31px]">
              Assalam-o-alaikum, {user.display_name || user.username}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="border border-[#9AA0AC] text-[#4E5463] text-[10px] font-semibold tracking-[.06em] px-[7px] py-[3px] rounded">
                {user.tier}
              </span>
              {user.kyc_status !== "APPROVED" && (
                <span className="inline-flex items-center gap-1 bg-warning-bg text-warning border border-warning text-[10.5px] font-semibold px-2 py-[3px] rounded">
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
          <div className="flex items-center gap-2.5">
            <span className="border border-border-strong bg-white text-[12.5px] px-[13px] py-2 rounded-[6px] cursor-pointer">
              Invite friends
            </span>
            <div className="w-8 h-8 rounded-full bg-[#C9C3B7]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.25fr_1fr_1fr] gap-4">
          <div className="bg-ink rounded-[10px] p-5 text-paper flex flex-col gap-1.5">
            <span className="font-mono text-[10.5px] tracking-[.14em] text-[#FF7A52]">
              POINTS BALANCE
            </span>
            <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums leading-[1.1]">
              {points.toLocaleString()}
            </span>
            <span className="text-[13px] text-[#C9CCD2]">
              ≈ Rs {rupees.toLocaleString()} · Rs 2,000 minimum
            </span>
            <button
              onClick={() => router.push("/rewards")}
              className="bg-vermilion text-white text-[12.5px] font-semibold py-[9px] rounded-[6px] text-center mt-1.5"
            >
              Withdraw
            </button>
          </div>

          <div className="bg-white border border-border rounded-[10px] p-5 flex flex-col gap-1.5">
            <span className="font-mono text-[10.5px] tracking-[.14em] text-muted">THIS WEEK</span>
            <span className="font-mono text-[34px] font-semibold tabular-nums leading-[1.15]">
              {rewards?.recent_entries
                .filter((e) => Number(e.amount) > 0)
                .reduce((sum, e) => sum + Number(e.amount), 0)
                .toLocaleString() ?? 0}
            </span>
            <span className="text-[13px] text-success font-medium">Recent earning activity</span>
          </div>

          <div className="bg-white border border-border rounded-[10px] p-5 flex flex-col gap-1.5">
            <span className="font-mono text-[10.5px] tracking-[.14em] text-muted">REFERRALS</span>
            <span className="font-mono text-[34px] font-semibold tabular-nums leading-[1.15]">
              {referrals?.referrals.length ?? 0}
            </span>
            <span className="text-[13px] text-muted">
              {activeReferrals} active · {pendingReferrals} pending signup
            </span>
            {referrals && (
              <button
                onClick={copyReferral}
                className="flex items-center justify-between bg-[#F5F2EC] border border-dashed border-border-strong rounded-[6px] px-2.5 py-[7px] mt-1.5"
              >
                <span className="font-mono text-xs font-semibold">{referrals.referral_code}</span>
                <span className="text-[11.5px] text-vermilion-deep font-semibold">
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-[18px]">
          <div className="bg-white border border-border rounded-[10px] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold tracking-[.16em]">
                LEARNING PROGRESS
              </span>
              <span className="text-[12.5px] text-vermilion-deep font-medium">All paths →</span>
            </div>
            {paths.length === 0 && (
              <p className="text-sm text-muted">No learning paths yet.</p>
            )}
            {paths.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/learning-paths/${p.slug}`)}
                className="flex items-center justify-between text-sm text-left"
              >
                <span className="font-medium">{p.title}</span>
                <span className="font-mono text-muted">
                  {p.access_tier === "PREMIUM" && (
                    <span className="text-premium font-semibold mr-1">★</span>
                  )}
                  {p.milestone_count} lessons
                </span>
              </button>
            ))}
          </div>

          <div className="bg-white border border-border rounded-[10px] p-5 flex flex-col gap-3">
            <span className="font-mono text-[11px] font-semibold tracking-[.16em]">
              RECENT ACTIVITY
            </span>
            {rewards && rewards.recent_entries.length > 0 ? (
              rewards.recent_entries.map((e, i) => {
                const isNegative = Number(e.amount) < 0;
                return (
                  <div
                    key={e.id}
                    className={`flex justify-between text-[13.5px] pb-2.5 ${
                      i < rewards.recent_entries.length - 1 ? "border-b border-[#F0EDE7]" : ""
                    }`}
                  >
                    <span className={isNegative ? "text-muted" : ""}>
                      {e.type}
                      {e.source_content_title ? ` · ${e.source_content_title}` : ""}
                    </span>
                    <span
                      className={`font-mono font-semibold shrink-0 ml-3 ${
                        isNegative ? "text-muted" : "text-success"
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
