"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch, getAccessToken } from "@/lib/auth";

interface Milestone {
  id: number;
  title: string;
  order: number;
  is_free: boolean;
  locked: boolean;
  completed: boolean;
}

interface LearningPathDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  access_tier: string;
  order: number;
  milestones: Milestone[];
}

export default function LearningPathDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [path, setPath] = useState<LearningPathDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const token = getAccessToken();
    const res = await authFetch(`/api/learning-paths/${slug}/`);
    if (res.ok) {
      setPath(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handleComplete(milestoneId: number) {
    setError(null);
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    const res = await authFetch(
      `/api/learning-paths/${slug}/milestones/${milestoneId}/complete/`,
      { method: "POST" }
    );
    if (res.ok) {
      load();
    } else if (res.status === 403) {
      setError("This milestone requires a Premium subscription.");
    } else if (res.status === 401) {
      setError("Your session expired. Please log in again.");
      router.push("/login");
    } else {
      setError("Something went wrong.");
    }
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!path)
    return <p className="p-10 font-mono text-sm text-muted">Learning path not found.</p>;

  return (
    <div className="max-w-xl mx-auto mt-16 px-4 pb-16">
      <div className="mb-6">
        <h1 className="font-display text-3xl mb-1.5">{path.title}</h1>
        <p className="text-sm text-muted mb-2">{path.description}</p>
        {path.access_tier === "PREMIUM" && (
          <span className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-premium text-white">
            ★ PREMIUM PATH
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 bg-alert/10 border border-alert rounded-sm text-alert text-sm">
          {error}
        </div>
      )}

      <div className="bg-paper-raised border border-border rounded-md overflow-hidden">
        {path.milestones.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 px-5 py-4 border-b border-border last:border-b-0 ${
              m.locked ? "opacity-50" : ""
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-mono text-xs mt-0.5 ${
                m.completed
                  ? "bg-success-bg text-success border border-success"
                  : m.locked
                    ? "bg-white text-muted border border-border-strong"
                    : "bg-white text-ink border border-ink"
              }`}
            >
              {m.completed ? "✓" : m.locked ? "🔒" : m.order}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{m.title}</div>
              {m.locked && (
                <div className="font-mono text-[11px] text-premium mt-1">
                  Upgrade to continue →
                </div>
              )}
            </div>
            {!m.completed && !m.locked && (
              <button
                onClick={() => handleComplete(m.id)}
                className="font-mono text-[11px] border border-border-strong rounded-sm px-2.5 py-1 hover:bg-paper transition-colors shrink-0"
              >
                Mark complete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
