"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";
import CreatorEarningsChart from "@/components/charts/CreatorEarningsChart";
import { getContentList } from "@/lib/content";
import { formatPoints } from "@/lib/ledger";
import { CREATOR_BOUNTY } from "@/lib/rewards";

const TYPE_OPTIONS = [
  { value: "TUTORIAL", label: "Tutorial" },
  { value: "NEWS", label: "News" },
  { value: "GUIDE", label: "Guide" },
  { value: "TOOL_LISTING", label: "Tool Listing" },
];

interface CreatorProfile {
  id: number;
  bio: string;
  status: string;
  applied_at: string;
  approved_at: string | null;
  total_earnings: string;
  published_count: number;
}

interface Submission {
  id: number;
  title: string;
  content_status: string;
  review_status: string;
  review_notes: string;
  submitted_at: string;
  reviewed_at: string | null;
}

interface LedgerEntry {
  type: string;
  amount: string;
  created_at: string;
}

const REVIEW_BADGE: Record<string, string> = {
  APPROVED: "bg-mint text-primary-deep",
  REJECTED: "bg-alert-bg text-alert",
  SUBMITTED: "bg-[#ECECE6] text-[#454B5C]",
  IN_REVIEW: "bg-premium-bg text-premium",
};

const REVIEW_LABEL: Record<string, string> = {
  APPROVED: "Published",
  REJECTED: "Returned",
  SUBMITTED: "In review",
  IN_REVIEW: "In review",
};

export default function CreatorPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [type, setType] = useState("TUTORIAL");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const u = await fetchCurrentUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);

    const profileRes = await authFetch("/api/creator/apply/");
    if (profileRes.ok) {
      setProfile(await profileRes.json());
      const [subsRes, balanceRes] = await Promise.all([
        authFetch("/api/creator/submissions/"),
        authFetch("/api/rewards/balance/"),
      ]);
      if (subsRes.ok) setSubmissions(await subsRes.json());
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setLedger(balanceData.recent_entries ?? []);
      }

      const content = await getContentList();
      const uniqueCategories = Array.from(
        new Map(content.map((c) => [c.category.id, c.category])).values()
      ).map((c) => ({ id: c.id, name: c.name }));
      setCategories(uniqueCategories);
      setCategoryId((prev) => prev ?? uniqueCategories[0]?.id ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApply() {
    setError(null);
    const res = await authFetch("/api/creator/apply/", { method: "POST" });
    if (res.ok) {
      load();
    } else if (res.status === 403) {
      setError("Creator Program applications require a Premium subscription.");
    } else {
      setError("Something went wrong.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || categoryId === null) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await authFetch("/api/creator/submissions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category_id: categoryId, type }),
      });
      if (res.ok) {
        setTitle("");
        setBody("");
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Submission failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  const inReviewCount = submissions.filter(
    (s) => s.review_status === "SUBMITTED" || s.review_status === "IN_REVIEW"
  ).length;
  const totalReads = 0; // no per-content read-count endpoint exposed yet

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar
        tier={user.tier}
        kycStatus={user.kyc_status}
        userName={user.display_name || user.username}
      />

      <div className="flex-1 min-w-0">
        {!profile ? (
          <div className="px-6 md:px-10 py-8 md:py-8 flex flex-col gap-6 max-w-[900px]">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] tracking-[.12em] text-premium">
                CREATOR STUDIO
              </span>
              <h1 className="font-display text-4xl md:text-5xl leading-none m-0">
                Know something about AI that Pakistan should read?
              </h1>
            </div>
            {error && (
              <div className="px-4 py-2.5 bg-alert-bg rounded-lg text-alert text-sm">{error}</div>
            )}
            <div className="bg-ink text-white rounded-[22px] p-7 flex flex-col gap-4">
              <p className="text-[15px] text-[#C9CFDC] m-0">
                Premium members can submit AI articles and tutorials, and earn a bounty in points
                each time editors publish their work.
              </p>
              <button
                onClick={handleApply}
                className="self-start bg-marigold text-ink font-bold text-sm px-4 py-3 rounded-xl"
              >
                Apply to Creator Program
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 md:px-10 py-8 md:py-8 pb-24 md:pb-10 flex flex-col gap-6">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] tracking-[.12em] text-premium">
                  CREATOR STUDIO
                </span>
                <h1 className="font-display text-4xl md:text-5xl leading-none m-0">
                  Write for Pakistan. Get paid for it.
                </h1>
              </div>
              <span className="text-xs font-semibold bg-mint text-primary-deep px-3 py-2 rounded-full">
                ●{" "}
                {profile.status === "APPROVED"
                  ? `Approved creator${
                      profile.approved_at
                        ? ` since ${new Date(profile.approved_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}`
                        : ""
                    }`
                  : profile.status}
              </span>
            </div>

            {error && <div className="px-4 py-2.5 bg-alert-bg rounded-lg text-alert text-sm">{error}</div>}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="bg-ink text-white rounded-2xl p-[18px] flex flex-col gap-2">
                <span className="text-xs text-muted-2">Lifetime bounties</span>
                <span className="font-mono text-[28px] font-semibold text-marigold">
                  {formatPoints(profile.total_earnings)}
                </span>
                <span className="text-xs text-muted-2">
                  ≈ Rs {Math.round((Number(profile.total_earnings) / 1000) * 250).toLocaleString()}
                </span>
              </div>
              <div className="bg-white border border-border rounded-2xl p-[18px] flex flex-col gap-2">
                <span className="text-xs text-muted">Published</span>
                <span className="font-mono text-[28px] font-semibold">
                  {profile.published_count}
                </span>
              </div>
              <div className="bg-white border border-border rounded-2xl p-[18px] flex flex-col gap-2">
                <span className="text-xs text-muted">Total reads</span>
                <span className="font-mono text-[28px] font-semibold">
                  {totalReads || "—"}
                </span>
              </div>
              <div className="bg-white border border-border rounded-2xl p-[18px] flex flex-col gap-2">
                <span className="text-xs text-muted">In review</span>
                <span className="font-mono text-[28px] font-semibold">{inReviewCount}</span>
              </div>
            </div>

            <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-3">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-2xl m-0">What your writing has earned</h3>
                  <span className="text-[13px] text-muted">
                    CREATOR_BOUNTY entries on your published work · per-entry bars, cumulative line
                  </span>
                </div>
                <div className="flex gap-3.5 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-marigold" />
                    Bounty paid
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-[2.5px] bg-ink" />
                    Cumulative
                  </span>
                </div>
              </div>
              <CreatorEarningsChart entries={ledger} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_1.3fr] gap-[18px]">
              <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-3.5">
                <h3 className="font-display text-2xl m-0">Submit new content</h3>
                {profile.status === "APPROVED" ? (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-semibold">Title</span>
                      <input
                        placeholder="A clear, specific headline"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-[46px] border border-border-strong rounded-[11px] px-3.5 text-sm outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-semibold">Category</span>
                        <select
                          value={categoryId ?? ""}
                          onChange={(e) => setCategoryId(Number(e.target.value))}
                          className="h-[46px] border border-border-strong rounded-[11px] px-3.5 text-sm outline-none focus:border-primary bg-white"
                          required
                        >
                          {categories.length === 0 && <option value="">No categories yet</option>}
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-semibold">Type</span>
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                          className="h-[46px] border border-border-strong rounded-[11px] px-3.5 text-sm outline-none focus:border-primary bg-white"
                        >
                          {TYPE_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-semibold">Draft or Google Doc link</span>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={4}
                        className="border border-border-strong rounded-[11px] px-3.5 py-3 text-sm outline-none focus:border-primary resize-none"
                        required
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted">A fixed {formatPoints(CREATOR_BOUNTY)}-pt bounty is paid when it&apos;s published</span>
                      <button
                        type="submit"
                        disabled={submitting || categoryId === null}
                        className="bg-ink text-white font-semibold text-sm px-4.5 py-3 rounded-[11px] disabled:opacity-60"
                      >
                        {submitting ? "Submitting…" : "Submit for review"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-muted">
                    Your application is {profile.status.toLowerCase()}. You&apos;ll be able to
                    submit once approved.
                  </p>
                )}
              </div>

              <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col">
                <h3 className="font-display text-2xl mb-3 m-0">Your submissions</h3>
                {submissions.length === 0 && (
                  <p className="font-mono text-sm text-muted">No submissions yet.</p>
                )}
                {submissions.map((s, i) => (
                  <div
                    key={s.id}
                    className={`grid grid-cols-[minmax(0,1fr)_100px_60px] gap-3 items-center py-3.5 ${
                      i > 0 ? "border-t border-[#EFEEE8]" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[15px] font-semibold truncate">{s.title}</span>
                      <span className="text-xs text-muted truncate">
                        {new Date(s.submitted_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                        {s.review_notes ? ` · ${s.review_notes}` : ""}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-full text-center justify-self-start ${
                        REVIEW_BADGE[s.review_status] ?? REVIEW_BADGE.SUBMITTED
                      }`}
                    >
                      {REVIEW_LABEL[s.review_status] ?? s.review_status}
                    </span>
                    <span className="font-mono text-[13px] font-semibold text-premium text-right">
                      —
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <MobileTabBar />
    </div>
  );
}
