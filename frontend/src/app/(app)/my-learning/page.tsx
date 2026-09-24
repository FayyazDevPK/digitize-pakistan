"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";

interface LearningPathSummary {
  id: number;
  title: string;
  slug: string;
  description: string;
  access_tier: string;
  order: number;
  milestone_count: number;
  completed_count: number;
  is_started: boolean;
}

export default function MyLearningPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [paths, setPaths] = useState<LearningPathSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED">("ALL");

  useEffect(() => {
    fetchCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      const res = await authFetch("/api/learning-paths/");
      if (res.ok) setPaths(await res.json());
      setLoading(false);
    });
  }, [router]);

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  const inProgress = paths.filter((p) => p.is_started && p.completed_count < p.milestone_count);
  const completed = paths.filter(
    (p) => p.milestone_count > 0 && p.completed_count >= p.milestone_count
  );
  const notStarted = paths.filter((p) => !p.is_started);

  const FILTERS: { key: typeof filter; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: paths.length },
    { key: "IN_PROGRESS", label: "In progress", count: inProgress.length },
    { key: "COMPLETED", label: "Completed", count: completed.length },
    { key: "NOT_STARTED", label: "Not started", count: notStarted.length },
  ];

  const visiblePaths =
    filter === "ALL"
      ? paths
      : filter === "IN_PROGRESS"
        ? inProgress
        : filter === "COMPLETED"
          ? completed
          : notStarted;

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar
        tier={user.tier}
        kycStatus={user.kyc_status}
        userName={user.display_name || user.username}
      />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-8 pb-24 md:pb-10 flex flex-col gap-7">
        <div className="flex items-end justify-between gap-5 flex-wrap">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] tracking-[.12em] text-primary">
              MY LEARNING
            </span>
            <h1 className="font-display text-4xl md:text-5xl leading-none m-0">
              Structured paths, paid in points.
            </h1>
          </div>
          <div className="flex gap-7 bg-white border border-border rounded-2xl px-5 py-3.5">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xl font-semibold">{inProgress.length}</span>
              <span className="text-xs text-muted">In progress</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xl font-semibold">{completed.length}</span>
              <span className="text-xs text-muted">Completed</span>
            </div>
          </div>
        </div>

        {paths.length === 0 ? (
          <p className="font-mono text-sm text-muted">No learning paths yet.</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-[13px] font-semibold px-3.5 py-2 rounded-full border transition-colors ${
                  filter === f.key
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-muted border-border hover:border-border-strong"
                }`}
              >
                {f.label} · {f.count}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
          {visiblePaths.map((p) => {
            const pct =
              p.milestone_count > 0
                ? Math.round((p.completed_count / p.milestone_count) * 100)
                : 0;
            const status = !p.is_started
              ? "Not started"
              : p.completed_count >= p.milestone_count && p.milestone_count > 0
                ? "Complete"
                : "In progress";
            return (
              <button
                key={p.id}
                onClick={() => router.push(`/learning-paths/${p.slug}`)}
                className="bg-white border border-border rounded-[20px] overflow-hidden flex flex-col text-left hover:border-ink transition-colors"
              >
                <div className="h-[110px] bg-[repeating-linear-gradient(135deg,#E6E5DE_0,#E6E5DE_10px,#EDECE6_10px,#EDECE6_20px)] p-3.5 flex justify-between items-start">
                  <span className="font-mono text-[10px] font-semibold tracking-[.08em] bg-white px-2 py-1.5 rounded-md">
                    {p.access_tier === "PREMIUM" ? "ADVANCED" : "BEGINNER"}
                  </span>
                  {p.access_tier === "PREMIUM" && (
                    <span className="font-mono text-[10px] font-semibold bg-ink text-marigold px-2 py-1.5 rounded-md">
                      ★ PREMIUM
                    </span>
                  )}
                </div>
                <div className="p-5 flex flex-col gap-2.5 flex-1">
                  <span className="font-display text-2xl leading-[1.05]">{p.title}</span>
                  <span className="text-sm text-muted leading-[1.45] min-h-[40px]">
                    {p.description}
                  </span>
                  <div className="h-1.5 bg-[#EFEEE8] rounded-[3px] overflow-hidden mt-1.5">
                    <div className="h-1.5 bg-primary rounded-[3px]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="font-mono text-muted">
                      {p.completed_count} / {p.milestone_count} milestones
                    </span>
                    <span className="font-semibold">{status}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
