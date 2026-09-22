"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      setDisplayName(u.display_name);
      setLoading(false);
    });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await authFetch("/api/me/", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
    });
    if (res.ok) {
      setUser(await res.json());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar tier={user.tier} />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-10 pb-24 md:pb-10">
        <div className="max-w-lg flex flex-col gap-5">
          <h1 className="font-display text-3xl">Settings</h1>

          <div className="bg-paper-raised border border-border-strong rounded-[10px] p-5 flex flex-col gap-4">
            <div className="flex gap-2">
              <span
                className={`font-mono text-[11px] px-2.5 py-1 rounded-sm ${
                  user.tier === "PREMIUM"
                    ? "bg-premium text-white"
                    : "bg-white border border-border-strong text-muted"
                }`}
              >
                {user.tier === "PREMIUM" ? "★ PREMIUM" : "FREE"}
              </span>
              {user.is_verified_badge && (
                <span className="font-mono text-[11px] px-2.5 py-1 rounded-sm bg-verified-bg text-verified border border-verified">
                  ✓ VERIFIED
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] uppercase text-muted">Username</span>
                <div className="text-sm text-muted">{user.username}</div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] uppercase text-muted">Email</span>
                <div className="text-sm text-muted">{user.email}</div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] uppercase text-muted">Display name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-white border border-border-strong rounded-[7px] px-[13px] py-[11px] text-sm outline-none focus:border-vermilion transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="self-start bg-ink text-paper text-sm font-semibold rounded-[7px] px-4 py-2.5 hover:bg-vermilion-deep transition-colors disabled:opacity-50"
              >
                {saved ? "Saved!" : saving ? "Saving..." : "Save changes"}
              </button>
            </form>
          </div>

          <div className="bg-paper-raised border border-border-strong rounded-[10px] p-5">
            <h2 className="font-display text-lg mb-2">
              {user.tier === "PREMIUM" ? "Your Premium perks" : "Free tier"}
            </h2>
            {user.tier === "PREMIUM" ? (
              <ul className="text-sm text-muted space-y-1">
                <li>• 2× read-to-earn rate and higher daily caps</li>
                <li>• Full access to all learning paths</li>
                <li>• Eligible for the Creator Program</li>
                <li>• Priority KYC review</li>
              </ul>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  Upgrade to Premium for accelerated rewards, full learning-path access, and
                  Creator Program eligibility.
                </p>
                <Link
                  href="/premium"
                  className="self-start bg-premium text-white text-sm font-semibold rounded-[7px] px-4 py-2.5 hover:opacity-90 transition-opacity"
                >
                  See Premium
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
