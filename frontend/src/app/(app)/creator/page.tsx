"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";

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

const REVIEW_BADGE: Record<string, string> = {
  APPROVED: "bg-success-bg text-success border border-success",
  REJECTED: "bg-alert/10 text-alert border border-alert",
  SUBMITTED: "bg-white border border-dashed border-border-strong text-muted",
  IN_REVIEW: "bg-warning-bg text-warning border border-warning",
};

export default function CreatorPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
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
      const subsRes = await authFetch("/api/creator/submissions/");
      if (subsRes.ok) {
        setSubmissions(await subsRes.json());
      }
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
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await authFetch("/api/creator/submissions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, excerpt, body, category_id: 1, type: "TUTORIAL" }),
      });
      if (res.ok) {
        setTitle("");
        setExcerpt("");
        setBody("");
        setShowForm(false);
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

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar tier={user.tier} />

      <div className="flex-1 min-w-0">
        {!profile ? (
          <div className="max-w-xl px-6 md:px-10 py-10">
            <h1 className="font-display text-3xl mb-6">Creator Program</h1>
            {error && (
              <div className="mb-4 px-4 py-2.5 bg-alert/10 border border-alert rounded-sm text-alert text-sm">
                {error}
              </div>
            )}
            <div className="bg-paper-raised border border-border rounded-md p-6">
              <p className="text-sm text-muted mb-4">
                Premium members can submit AI articles and tutorials, and earn revenue as they&apos;re
                published.
              </p>
              <button
                onClick={handleApply}
                className="font-mono text-xs bg-ink text-paper rounded-sm px-4 py-2 hover:bg-vermilion-deep transition-colors"
              >
                Apply to Creator Program
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-[#2A1024] px-6 md:px-7 py-[22px] flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-[38px] h-[38px] rounded-full bg-[#5C2247]" />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[16px] font-semibold text-creator-bg">
                      {user.display_name || user.username}
                    </span>
                    <span className="bg-[#7A2E5E] text-creator-bg text-[10px] font-semibold tracking-[.06em] px-2 py-[3px] rounded">
                      ✎ CREATOR
                    </span>
                    {user.is_verified_badge && (
                      <span className="bg-[#F3E3EE] text-[#5C2247] text-[10px] font-semibold px-2 py-[3px] rounded-full">
                        ✓ VERIFIED
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11.5px] text-[#C9A8BD]">
                    CREATOR STUDIO · {profile.status}
                  </span>
                </div>
              </div>
              {profile.status === "APPROVED" && (
                <button
                  onClick={() => setShowForm((s) => !s)}
                  className="bg-vermilion text-white text-[13px] font-semibold px-4 py-2.5 rounded-[6px]"
                >
                  New submission
                </button>
              )}
            </div>

            <div className="px-6 md:px-7 py-6 md:py-[30px] pb-24 md:pb-[30px] flex flex-col gap-5">
              {error && (
                <div className="px-4 py-2.5 bg-alert/10 border border-alert rounded-sm text-alert text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-white border border-border rounded-[9px] p-[18px]">
                  <div className="font-mono text-[10.5px] tracking-[.14em] text-muted">
                    TOTAL EARNINGS
                  </div>
                  <div className="font-mono text-[30px] font-semibold tabular-nums mt-1.5">
                    {profile.total_earnings} pts
                  </div>
                </div>
                <div className="bg-white border border-border rounded-[9px] p-[18px]">
                  <div className="font-mono text-[10.5px] tracking-[.14em] text-muted">PUBLISHED</div>
                  <div className="font-mono text-[30px] font-semibold tabular-nums mt-1.5">
                    {profile.published_count}
                  </div>
                </div>
              </div>

              {showForm && profile.status === "APPROVED" && (
                <div className="bg-white border border-border rounded-[10px] p-5">
                  <h2 className="font-display text-lg mb-4">Submit new content</h2>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                      placeholder="Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="border border-border-strong rounded-sm px-3 py-2 bg-white text-sm outline-none focus:border-vermilion"
                      required
                    />
                    <input
                      placeholder="Excerpt"
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      className="border border-border-strong rounded-sm px-3 py-2 bg-white text-sm outline-none focus:border-vermilion"
                    />
                    <textarea
                      placeholder="Body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={5}
                      className="border border-border-strong rounded-sm px-3 py-2 bg-white text-sm outline-none focus:border-vermilion"
                      required
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="self-start font-mono text-xs bg-ink text-paper rounded-sm px-4 py-2 hover:bg-vermilion-deep transition-colors disabled:opacity-60"
                    >
                      {submitting ? "Submitting…" : "Submit for review"}
                    </button>
                  </form>
                </div>
              )}

              <div className="bg-white border border-border rounded-[10px] overflow-hidden">
                <div className="px-[18px] py-[15px] border-b border-border flex items-center justify-between">
                  <span className="font-mono text-[10.5px] font-semibold tracking-[.16em]">
                    SUBMISSIONS
                  </span>
                  <span className="text-[12.5px] text-vermilion-deep font-medium">
                    All {submissions.length} →
                  </span>
                </div>
                {submissions.length === 0 && (
                  <p className="font-mono text-sm text-muted px-[18px] py-4">No submissions yet.</p>
                )}
                {submissions.map((s, i) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3.5 px-[18px] py-3.5 ${
                      i < submissions.length - 1 ? "border-b border-[#F0EDE7]" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate">{s.title}</span>
                      <span className="font-mono text-[11px] text-muted">
                        {new Date(s.submitted_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                        {s.review_notes ? ` · ${s.review_notes}` : ""}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-[10px] font-semibold px-2 py-[3px] rounded w-[86px] text-center ${
                        REVIEW_BADGE[s.review_status] ?? REVIEW_BADGE.SUBMITTED
                      }`}
                    >
                      {s.review_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <MobileTabBar />
    </div>
  );
}
