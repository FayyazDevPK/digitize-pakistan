"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";

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
  REWARDED: "bg-success-bg text-success border border-success",
  QUALIFIED: "bg-premium-bg text-premium border border-premium",
  PENDING: "bg-white border border-dashed border-border-strong text-muted",
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

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar tier={user.tier} />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-10 pb-24 md:pb-10">
        <div className="max-w-lg flex flex-col gap-5">
          <h1 className="font-display text-3xl">Referrals</h1>

          {!data ? (
            <p className="font-mono text-sm text-muted">Could not load referrals.</p>
          ) : (
            <>
              <div className="bg-paper-raised border border-border-strong rounded-[10px] p-5 flex flex-col gap-3">
                <div className="font-mono text-[11px] uppercase text-muted">
                  Your referral code
                </div>
                <div className="font-mono text-2xl font-semibold">{data.referral_code}</div>
                <button
                  onClick={copyLink}
                  className="self-start bg-ink text-paper text-sm font-semibold rounded-[7px] px-4 py-2.5 hover:bg-vermilion-deep transition-colors"
                >
                  {copied ? "Copied!" : "Copy invite link"}
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="font-display text-lg">
                  People you&apos;ve referred ({data.referrals.length})
                </h2>
                {data.referrals.length === 0 && (
                  <p className="font-mono text-sm text-muted">No referrals yet.</p>
                )}
                <div className="bg-paper-raised border border-border-strong rounded-[10px] overflow-hidden">
                  {data.referrals.map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between items-center px-5 py-3 border-b border-border last:border-b-0"
                    >
                      <span className="text-sm">{r.referred_username}</span>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded-sm ${
                          STATUS_STYLE[r.status] ?? STATUS_STYLE.PENDING
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
