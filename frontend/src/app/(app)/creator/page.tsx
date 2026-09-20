"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";

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
  IN_REVIEW: "bg-premium-bg text-premium border border-premium",
};

export default function CreatorPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");

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
    setError(null);
    const res = await authFetch("/api/creator/submissions/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, excerpt, body, category_id: 1, type: "TUTORIAL" }),
    });
    if (res.ok) {
      setTitle("");
      setExcerpt("");
      setBody("");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Submission failed.");
    }
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto mt-16 px-4 pb-16">
      <h1 className="font-display text-3xl mb-6">Creator Program</h1>

      {error && (
        <div className="mb-4 px-4 py-2.5 bg-alert/10 border border-alert rounded-sm text-alert text-sm">
          {error}
        </div>
      )}

      {!profile ? (
        <div className="bg-paper-raised border border-border rounded-md p-6">
          <p className="text-sm text-muted mb-4">
            Premium members can submit AI articles and tutorials, and earn revenue as they're
            published.
          </p>
          <button
            onClick={handleApply}
            className="font-mono text-xs bg-ink text-paper rounded-sm px-4 py-2 hover:bg-vermilion-deep transition-colors"
          >
            Apply to Creator Program
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-6">
            <span className="font-mono text-[11px] px-2.5 py-1 rounded-sm bg-creator-bg text-creator border border-creator">
              CREATOR · {profile.status}
            </span>
          </div>

          <div className="bg-paper-raised border border-border rounded-md p-5 mb-8 flex gap-8">
            <div>
              <div className="font-mono text-[11px] uppercase text-muted">Total earnings</div>
              <div className="font-mono text-2xl font-semibold mt-1">
                {profile.total_earnings} pts
              </div>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase text-muted">Published</div>
              <div className="font-mono text-2xl font-semibold mt-1">
                {profile.published_count}
              </div>
            </div>
          </div>

          {profile.status === "APPROVED" && (
            <div className="bg-paper-raised border border-border rounded-md p-5 mb-8">
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
                  className="self-start font-mono text-xs bg-ink text-paper rounded-sm px-4 py-2 hover:bg-vermilion-deep transition-colors"
                >
                  Submit for review
                </button>
              </form>
            </div>
          )}

          <h2 className="font-display text-lg mb-3">Your submissions</h2>
          {submissions.length === 0 && (
            <p className="font-mono text-sm text-muted">No submissions yet.</p>
          )}
          <div className="bg-paper-raised border border-border rounded-md overflow-hidden">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="flex justify-between items-center px-5 py-3 border-b border-border last:border-b-0"
              >
                <span className="text-sm">{s.title}</span>
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded-sm ${
                    REVIEW_BADGE[s.review_status] ?? REVIEW_BADGE.SUBMITTED
                  }`}
                >
                  {s.review_status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
