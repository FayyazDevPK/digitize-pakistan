"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, clearTokens, CurrentUser } from "@/lib/auth";

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [rewards, setRewards] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      const res = await authFetch("/api/rewards/balance/");
      if (res.ok) {
        setRewards(await res.json());
      }
      setLoading(false);
    });
  }, [router]);

  function handleLogout() {
    clearTokens();
    router.replace("/login");
  }

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;
  if (!user) return null;

  return (
    <div style={{ maxWidth: 480, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user.username}</p>
      <ul>
        <li>Role: {user.role}</li>
        <li>Tier: {user.tier}</li>
        <li>KYC status: {user.kyc_status}</li>
      </ul>

      {rewards && (
        <div style={{ marginTop: 24, borderTop: "1px solid #ddd", paddingTop: 16 }}>
          <h2 style={{ fontSize: 16 }}>Rewards balance</h2>
          <p style={{ fontSize: 28, fontWeight: 600, fontFamily: "monospace" }}>
            {rewards.balance} pts
          </p>
          <h3 style={{ fontSize: 13, color: "#666" }}>Recent activity</h3>
          <ul style={{ fontSize: 13 }}>
            {rewards.recent_entries.map((e) => (
              <li key={e.id}>
                +{e.amount} pts — {e.type}
                {e.source_content_title ? ` (${e.source_content_title})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={handleLogout} style={{ marginTop: 16 }}>
        Log out
      </button>
    </div>
  );
}
