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

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;
  if (!data) return <p style={{ padding: 40 }}>Could not load referrals.</p>;

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>Referrals</h1>

      <div style={{ padding: 16, background: "#f5f5f5", borderRadius: 6, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase" }}>
          Your referral code
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 600, margin: "4px 0" }}>
          {data.referral_code}
        </div>
        <button onClick={copyLink}>{copied ? "Copied!" : "Copy invite link"}</button>
      </div>

      <h2 style={{ fontSize: 16 }}>People you've referred ({data.referrals.length})</h2>
      {data.referrals.length === 0 && <p style={{ color: "#666" }}>No referrals yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {data.referrals.map((r) => (
          <li
            key={r.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid #ddd",
            }}
          >
            <span>{r.referred_username}</span>
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color:
                  r.status === "REWARDED" ? "green" : r.status === "QUALIFIED" ? "#b8860b" : "#999",
              }}
            >
              {r.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
