"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";
import { REFERRAL_BONUS } from "@/lib/rewards";
import ReferralGrowthChart from "@/components/charts/ReferralGrowthChart";

interface ReferralEntry {
  id: number;
  referred_username: string;
  status: string;
  created_at: string;
}

interface ReferralsData {
  referral_code: string;
  referrals: ReferralEntry[];
}

const STATUS_STYLE: Record<string, string> = {
  REWARDED: "bg-iris text-white",
  QUALIFIED: "bg-[#9D9EEA] text-ink",
  PENDING: "bg-premium-bg text-premium",
};

export default function ReferralsPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [data, setData] = useState<ReferralsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      const res = await authFetch("/api/referrals/");
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    });
  }, [router]);

  function copyLink() {
    if (!data) return;
    const link = `${window.location.origin}/register?ref=${data.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  const referrals = data?.referrals ?? [];
  const joined = referrals.length;
  const qualified = referrals.filter((r) => r.status === "QUALIFIED" || r.status === "REWARDED").length;
  const rewarded = referrals.filter((r) => r.status === "REWARDED").length;
  const qualifiedPct = joined > 0 ? Math.round((qualified / joined) * 100) : 0;
  const rewardedPct = joined > 0 ? Math.round((rewarded / joined) * 100) : 0;

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar
        tier={user.tier}
        kycStatus={user.kyc_status}
        userName={user.display_name || user.username}
      />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-8 pb-24 md:pb-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] tracking-[.12em] text-iris">REFERRALS</span>
          <h1 className="font-display text-4xl md:text-5xl leading-none m-0">
            Bring a friend. Earn the bonus.
          </h1>
        </div>

        {!data ? (
          <p className="font-mono text-sm text-muted">Could not load referrals.</p>
        ) : (
          <>
            <div className="bg-iris text-white rounded-[22px] p-6 md:p-7 grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-6 items-center">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] tracking-[.12em] text-[#E7E7FB]">
                  YOUR CODE
                </span>
                <span className="font-mono text-3xl font-semibold tracking-[.04em]">
                  {data.referral_code}
                </span>
              </div>
              <div className="flex items-center bg-white/[.14] border border-white/30 rounded-xl pl-3.5 py-1 gap-2">
                <span className="font-mono text-sm flex-1 truncate">
                  digitize.com.pk/r/{data.referral_code}
                </span>
                <button
                  onClick={copyLink}
                  className="bg-white text-[#3A3BA8] text-sm font-bold px-3.5 py-2.5 rounded-lg shrink-0"
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
              <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-2xl m-0">Referral funnel</h3>
                  <span className="text-[13px] text-muted">
                    Each friend moves Pending → Qualified → Rewarded
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-[90px_1fr_36px] gap-3 items-center">
                    <span className="text-[13px] font-semibold">Joined</span>
                    <div className="h-10 bg-premium-bg rounded-lg flex items-center px-3 text-xs font-medium text-premium">
                      {joined - qualified > 0 ? `${joined - qualified} still pending` : ""}
                    </div>
                    <span className="font-mono text-lg font-semibold text-right">{joined}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr_36px] gap-3 items-center">
                    <span className="text-[13px] font-semibold">Qualified</span>
                    <div className="h-10 rounded-lg bg-[#EFEFF9] overflow-hidden">
                      <div
                        className="h-10 bg-[#9D9EEA] rounded-lg flex items-center px-3 text-xs font-medium text-ink"
                        style={{ width: `${qualifiedPct}%` }}
                      >
                        {qualifiedPct > 15 ? `${qualifiedPct}%` : ""}
                      </div>
                    </div>
                    <span className="font-mono text-lg font-semibold text-right">{qualified}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr_36px] gap-3 items-center">
                    <span className="text-[13px] font-semibold">Rewarded</span>
                    <div className="h-10 rounded-lg bg-[#EFEFF9] overflow-hidden">
                      <div
                        className="h-10 bg-iris rounded-lg flex items-center px-3 text-xs font-medium text-white"
                        style={{ width: `${rewardedPct}%` }}
                      >
                        {rewardedPct > 15 ? "pts" : ""}
                      </div>
                    </div>
                    <span className="font-mono text-lg font-semibold text-right">{rewarded}</span>
                  </div>
                </div>
                <div className="bg-paper rounded-2xl p-3.5 text-[13px] leading-[1.5] text-graphite">
                  A referral <b>qualifies</b> once your friend verifies their email and completes
                  a learning-path lesson. It&apos;s <b>rewarded</b> when the +{REFERRAL_BONUS.free}{" "}
                  pts bonus (+{REFERRAL_BONUS.premium} on Premium) is paid to you — only you earn
                  the referral bonus.
                </div>
              </div>

              <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-3.5">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display text-2xl m-0">New referrals by month</h3>
                    <span className="text-[13px] text-muted">Stacked by where each one is today</span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm bg-iris" />
                      Rewarded
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm bg-[#9D9EEA]" />
                      Qualified
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm bg-marigold" />
                      Pending
                    </span>
                  </div>
                </div>
                <ReferralGrowthChart referrals={referrals} />
              </div>
            </div>

            <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-display text-2xl m-0">People you&apos;ve referred</h3>
                {referrals.length > 0 && (
                  <span className="font-mono text-xs text-muted">
                    Showing {referrals.length} of {referrals.length}
                  </span>
                )}
              </div>
              {referrals.length === 0 && (
                <p className="font-mono text-sm text-muted mt-3">No referrals yet.</p>
              )}
              {referrals.map((r, i) => (
                <div
                  key={r.id}
                  className={`grid grid-cols-[36px_1fr_140px_auto] sm:grid-cols-[40px_1fr_160px_120px] gap-3 items-center py-3 text-sm ${
                    i > 0 ? "border-t border-[#EFEEE8]" : ""
                  }`}
                >
                  <span className="w-9 h-9 rounded-[10px] bg-creator-bg text-creator flex items-center justify-center font-bold text-xs">
                    {r.referred_username.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="font-semibold truncate">{r.referred_username}</span>
                  <span className="font-mono text-xs text-muted hidden sm:inline">
                    Joined{" "}
                    {new Date(r.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-full text-center justify-self-start ${
                      STATUS_STYLE[r.status] ?? "bg-paper text-muted"
                    }`}
                  >
                    ● {r.status}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <MobileTabBar />
    </div>
  );
}
