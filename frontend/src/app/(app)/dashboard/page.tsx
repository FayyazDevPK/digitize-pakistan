"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, clearTokens, CurrentUser } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (!u) {
        router.replace("/login");
      } else {
        setUser(u);
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
      <button onClick={handleLogout}>Log out</button>
    </div>
  );
}
