"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser } from "@/lib/auth";

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
  const [data, setData] = useState<ReferralsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
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
  if (!data)
    return <p className="p-10 font-mono text-sm text-muted">Could not load referrals.</p>;

  return (
    <div className="max-w-lg mx-auto mt-16 px-4 pb-16">
      <h1 className="font-display text-3xl mb-6">Referrals</h1>

      <div className="bg-paper-raised border border-border rounded-md p-5 mb-8">
        <div className="font-mono text-[11px] uppercase text-muted mb-1">
          Your referral code
        </div>
        <div className="font-mono text-2xl font-semibold mb-3">{data.referral_code}</div>
        <button
          onClick={copyLink}
          className="font-mono text-xs bg-ink text-paper rounded-sm px-3 py-2 hover:bg-vermilion-deep transition-colors"
        >
          {copied ? "Copied!" : "Copy invite link"}
        </button>
      </div>

      <h2 className="font-display text-lg mb-3">
        People you&apos;ve referred ({data.referrals.length})
      </h2>
      {data.referrals.length === 0 && (
        <p className="font-mono text-sm text-muted">No referrals yet.</p>
      )}
      <div className="bg-paper-raised border border-border rounded-md overflow-hidden">
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
  );
}
