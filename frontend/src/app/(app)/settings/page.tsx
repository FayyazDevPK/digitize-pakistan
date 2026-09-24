"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, storeTokens, clearTokens, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";

const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan",
  "Peshawar", "Quetta", "Hyderabad", "Sialkot", "Other",
];

const INPUT =
  "h-[46px] bg-white border border-border-strong rounded-[11px] px-3.5 text-sm outline-none focus:border-primary transition-colors";

function firstError(body: Record<string, unknown>): string {
  for (const v of Object.values(body)) {
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    if (typeof v === "string") return v;
  }
  return "Something went wrong.";
}

function daysAgo(iso: string | null): string {
  if (!iso) return "Never changed since signup";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? "Last changed today" : `Last changed ${days} day${days === 1 ? "" : "s"} ago`;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  function fillForm(u: CurrentUser) {
    setDisplayName(u.display_name);
    setPhone(u.phone);
    setCity(u.city);
  }

  async function loadAvatar(u: CurrentUser) {
    if (!u.has_avatar) {
      setAvatarSrc(null);
      return;
    }
    const res = await authFetch("/api/me/avatar/");
    if (res.ok) setAvatarSrc(URL.createObjectURL(await res.blob()));
  }

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      fillForm(u);
      loadAvatar(u);
      setLoading(false);
    });
  }, [router]);

  async function patchMe(body: BodyInit, json: boolean): Promise<CurrentUser | null> {
    setError(null);
    const res = await authFetch("/api/me/", {
      method: "PATCH",
      ...(json ? { headers: { "Content-Type": "application/json" } } : {}),
      body,
    });
    if (!res.ok) {
      setError(firstError(await res.json().catch(() => ({}))));
      return null;
    }
    const updated: CurrentUser = await res.json();
    setUser(updated);
    return updated;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const updated = await patchMe(
      JSON.stringify({ display_name: displayName, phone, city }),
      true
    );
    if (updated) {
      fillForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file);
    const updated = await patchMe(form, false);
    if (updated) await loadAvatar(updated);
    e.target.value = "";
  }

  async function toggleDigests() {
    if (!user) return;
    await patchMe(JSON.stringify({ email_digests: !user.email_digests }), true);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordMsg(null);
    const res = await authFetch("/api/me/password/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      storeTokens(body.access, body.refresh);
      setCurrentPassword("");
      setNewPassword("");
      setShowPassword(false);
      setPasswordMsg({ ok: true, text: "Password changed. Other devices were signed out." });
      const fresh = await fetchCurrentUser();
      if (fresh) setUser(fresh);
    } else if (res.status === 429) {
      setPasswordMsg({ ok: false, text: "Too many attempts. Try again later." });
    } else {
      setPasswordMsg({ ok: false, text: firstError(body) });
    }
    setChangingPassword(false);
  }

  async function handleDeactivate(e: React.FormEvent) {
    e.preventDefault();
    setDeactivating(true);
    setDeactivateError(null);
    const res = await authFetch("/api/me/deactivate/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deactivatePassword }),
    });
    if (res.ok) {
      clearTokens();
      router.replace("/login");
      return;
    }
    if (res.status === 429) setDeactivateError("Too many attempts. Try again later.");
    else setDeactivateError(firstError(await res.json().catch(() => ({}))));
    setDeactivating(false);
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  const initial = (user.display_name || user.username).charAt(0).toUpperCase();
  const memberSince = new Date(user.date_joined).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar
        tier={user.tier}
        kycStatus={user.kyc_status}
        userName={user.display_name || user.username}
      />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-8 pb-24 md:pb-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] tracking-[.12em] text-primary">SETTINGS</span>
          <h1 className="font-display text-4xl md:text-5xl leading-none m-0">Your account</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
          <div className="flex flex-col gap-[18px]">
            <div className="bg-white border border-border rounded-[22px] p-6 md:p-7 flex flex-col gap-5">
              <div className="flex items-center gap-4">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt="Your avatar"
                    className="w-16 h-16 rounded-[18px] object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-[18px] bg-primary-light text-ink flex items-center justify-center font-bold text-xl shrink-0">
                    {initial}
                  </div>
                )}
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="text-lg font-bold truncate">
                    {user.display_name || user.username}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    @{user.username} · member since {memberSince}
                  </span>
                </div>
                <label className="border border-border-strong px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold cursor-pointer shrink-0">
                  Change photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    className="sr-only"
                    onChange={handlePhoto}
                  />
                </label>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold">Display name</span>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={INPUT}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold">Username</span>
                    <div className="h-[46px] flex items-center border border-border rounded-[11px] px-3.5 text-sm text-muted bg-paper">
                      {user.username}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold">Email</span>
                    <div className="h-[46px] flex items-center border border-border rounded-[11px] px-3.5 text-sm text-muted bg-paper truncate">
                      {user.email}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold">Mobile</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      className={`${INPUT} font-mono`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold">City</span>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={INPUT}
                    >
                      <option value="">Select city</option>
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {error && <p className="text-alert text-sm m-0">{error}</p>}
                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      fillForm(user);
                      setError(null);
                    }}
                    className="px-4 py-3 text-sm font-semibold text-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-primary text-white text-sm font-semibold rounded-[11px] px-[18px] py-3 disabled:opacity-60"
                  >
                    {saved ? "Saved!" : saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white border border-border rounded-[22px] px-6 md:px-7">
              <div className="py-4 border-b border-[#EFEEE8] flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">Password</span>
                    <span className="text-[13px] text-muted">
                      {daysAgo(user.password_changed_at)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword((v) => !v);
                      setPasswordMsg(null);
                    }}
                    className="border border-border-strong px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold"
                  >
                    {showPassword ? "Cancel" : "Change"}
                  </button>
                </div>
                {showPassword && (
                  <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={INPUT}
                    />
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="New password (min 8 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={INPUT}
                    />
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="self-end bg-ink text-white text-sm font-semibold rounded-[11px] px-[18px] py-3 disabled:opacity-60"
                    >
                      {changingPassword ? "Updating..." : "Update password"}
                    </button>
                  </form>
                )}
                {passwordMsg && (
                  <p className={`text-sm m-0 ${passwordMsg.ok ? "text-primary-deep" : "text-alert"}`}>
                    {passwordMsg.text}
                  </p>
                )}
              </div>
              <div className="flex justify-between items-center py-4 border-b border-[#EFEEE8]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">Identity (KYC)</span>
                  <span className="text-[13px] text-muted">
                    {user.kyc_status === "APPROVED"
                      ? "Verified"
                      : user.kyc_status === "PENDING"
                        ? "Submitted, under review"
                        : user.kyc_status === "REJECTED"
                          ? "Needs resubmission"
                          : "Not started"}
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-full ${
                    user.kyc_status === "APPROVED"
                      ? "bg-mint text-primary-deep"
                      : user.kyc_status === "REJECTED"
                        ? "bg-alert-bg text-alert"
                        : "bg-[#ECECE6] text-[#454B5C]"
                  }`}
                >
                  ● {user.kyc_status === "APPROVED" ? "Verified" : user.kyc_status}
                </span>
              </div>
              <div className="flex justify-between items-center py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">Email digests</span>
                  <span className="text-[13px] text-muted">Weekly AI roundup, payout receipts</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={user.email_digests}
                  aria-label="Email digests"
                  onClick={toggleDigests}
                  className={`w-11 h-[26px] rounded-[13px] relative transition-colors ${
                    user.email_digests ? "bg-primary" : "bg-border-strong"
                  }`}
                >
                  <span
                    className={`absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all ${
                      user.email_digests ? "right-[3px]" : "left-[3px]"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-3.5">
              <span className="font-mono text-[11px] tracking-[.12em] text-muted">
                CURRENT TIER
              </span>
              <span className="font-display text-3xl">
                {user.tier === "PREMIUM" ? "Premium" : "Free"}
              </span>
              <div className="flex flex-col text-sm">
                {[
                  { label: "Read to earn", ok: true },
                  { label: "Beginner & Intermediate paths", ok: true },
                  { label: "Referral bonuses", ok: true },
                  { label: "Advanced paths", ok: user.tier === "PREMIUM" },
                  { label: "Priority payouts", ok: user.tier === "PREMIUM" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className={`flex justify-between py-2.5 border-t border-[#EFEEE8] ${
                      row.ok ? "" : "text-muted-2"
                    }`}
                  >
                    <span>{row.label}</span>
                    <span className={row.ok ? "text-primary font-semibold" : ""}>
                      {row.ok ? "✓" : "Premium"}
                    </span>
                  </div>
                ))}
              </div>
              {user.tier !== "PREMIUM" && (
                <button
                  onClick={() => router.push("/premium")}
                  className="bg-marigold text-ink font-bold text-sm text-center py-3.5 rounded-xl"
                >
                  Upgrade to Premium · Rs 950/mo
                </button>
              )}
            </div>
            {!showDeactivate ? (
              <button
                type="button"
                onClick={() => setShowDeactivate(true)}
                className="self-start text-[13px] font-semibold text-alert px-1.5"
              >
                Delete account…
              </button>
            ) : (
              <form
                onSubmit={handleDeactivate}
                className="bg-white border border-alert rounded-[22px] p-6 flex flex-col gap-3.5"
              >
                <span className="font-mono text-[11px] tracking-[.12em] text-alert">
                  DEACTIVATE ACCOUNT
                </span>
                <p className="text-sm leading-[1.5] text-graphite m-0">
                  This signs you out everywhere and disables your account. Your identity
                  verification, rewards ledger, withdrawals and payments are retained for
                  compliance and are not deleted.
                </p>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password to confirm"
                  value={deactivatePassword}
                  onChange={(e) => setDeactivatePassword(e.target.value)}
                  className={INPUT}
                />
                {deactivateError && <p className="text-alert text-sm m-0">{deactivateError}</p>}
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeactivate(false);
                      setDeactivatePassword("");
                      setDeactivateError(null);
                    }}
                    className="px-4 py-3 text-sm font-semibold text-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deactivating || !deactivatePassword}
                    className="bg-alert text-white text-sm font-semibold rounded-[11px] px-[18px] py-3 disabled:opacity-60"
                  >
                    {deactivating ? "Deactivating..." : "Deactivate account"}
                  </button>
                </div>
              </form>
            )}
          </aside>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
