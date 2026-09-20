"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";

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
    <div className="max-w-lg mx-auto mt-16 px-4 pb-16">
      <h1 className="font-display text-3xl mb-6">Settings</h1>

      <div className="bg-paper-raised border border-border rounded-md p-5 mb-6">
        <div className="flex gap-2 mb-4">
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

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label className="block font-mono text-[11px] uppercase text-muted mb-1.5">
              Username
            </label>
            <div className="text-sm text-muted">{user.username}</div>
          </div>
          <div>
            <label className="block font-mono text-[11px] uppercase text-muted mb-1.5">
              Email
            </label>
            <div className="text-sm text-muted">{user.email}</div>
          </div>
          <div>
            <label className="block font-mono text-[11px] uppercase text-muted mb-1.5">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-border-strong rounded-sm px-3 py-2 bg-white text-sm outline-none focus:border-vermilion"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="self-start font-mono text-xs bg-ink text-paper rounded-sm px-4 py-2 hover:bg-vermilion-deep transition-colors disabled:opacity-50"
          >
            {saved ? "Saved!" : saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>

      <div className="bg-paper-raised border border-border rounded-md p-5">
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
          <p className="text-sm text-muted">
            Upgrade to Premium for accelerated rewards, full learning-path access, and Creator
            Program eligibility.
          </p>
        )}
      </div>
    </div>
  );
}
