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
    const res = await authFetch(`/api/learning-paths/${slug}/`);
    if (res.ok) {
      setPath(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
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

  if (loading) return <p style={{ padding: 40 }}>Loading...</p>;
  if (!path) return <p style={{ padding: 40 }}>Learning path not found.</p>;

  return (
    <div style={{ maxWidth: 600, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>{path.title}</h1>
      <p>{path.description}</p>
      {path.access_tier === "PREMIUM" && (
        <p style={{ fontSize: 12, color: "#b8860b" }}>★ PREMIUM PATH</p>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ol style={{ listStyle: "none", padding: 0 }}>
        {path.milestones.map((m) => (
          <li
            key={m.id}
            style={{
              padding: "12px 0",
              borderBottom: "1px solid #ddd",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              opacity: m.locked ? 0.5 : 1,
            }}
          >
            <span>
              {m.completed ? "✓ " : m.locked ? "🔒 " : ""}
              {m.title}
           </span>
            {!m.completed && !m.locked && (
              <button onClick={() => handleComplete(m.id)}>Mark complete</button>
            )}
            {m.locked && <span style={{ fontSize: 11 }}>Upgrade to continue</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
