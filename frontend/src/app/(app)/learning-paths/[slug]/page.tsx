"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, getAccessToken } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";
import BackLink from "@/components/BackLink";

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
  const [tier, setTier] = useState<string | undefined>(undefined);
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
    fetchCurrentUser().then((u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setTier(u.tier);
    });
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

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar tier={tier} />

      {!path ? (
        <p className="p-10 font-mono text-sm text-muted">Learning path not found.</p>
      ) : (
        <div className="flex-1 min-w-0">
          {(() => {
            const total = path.milestones.length;
            const completedCount = path.milestones.filter((m) => m.completed).length;
            const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
            const nextMilestone = path.milestones.find((m) => !m.completed && !m.locked);
            const hasLocked = path.milestones.some((m) => m.locked);

            return (
              <>
                <div className="bg-ink px-6 md:px-[34px] pt-5 pb-[30px] flex flex-col md:flex-row items-start md:items-end justify-between gap-[30px]">
                  <div className="flex flex-col gap-2.5 max-w-[640px]">
                    <BackLink
                      label="Dashboard"
                      className="inline-flex items-center font-mono text-[11px] uppercase text-[#9BA1AD] hover:text-paper transition-colors mb-1"
                    />
                    <span className="font-mono text-[10.5px] tracking-[.14em] text-[#FF7A52]">
                      LEARNING PATH · {path.access_tier}
                    </span>
                    <span className="font-display text-[40px] text-paper leading-[1.08]">
                      {path.title}
                    </span>
                    <span className="text-[14.5px] text-[#C9CCD2] leading-[1.6]">
                      {path.description}
                    </span>
                    <div className="flex gap-[18px] font-mono text-xs text-[#B4B9C3] mt-1">
                      <span>{total} MILESTONES</span>
                    </div>
                  </div>
                  <div className="bg-[#1C212B] border border-[#2E3441] rounded-[10px] p-[18px] w-full md:w-[280px] shrink-0 flex flex-col gap-2.5">
                    <div className="flex justify-between text-[13px] text-[#C9CCD2]">
                      <span>Your progress</span>
                      <span className="font-mono font-semibold text-paper">
                        {completedCount} / {total}
                      </span>
                    </div>
                    <div className="h-[7px] bg-[#2E3441] rounded-full">
                      <div
                        className="h-[7px] bg-vermilion rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {nextMilestone ? (
                      <button
                        onClick={() => handleComplete(nextMilestone.id)}
                        className="bg-vermilion text-white text-[13px] font-semibold py-[11px] rounded-[6px] text-center"
                      >
                        Continue milestone {nextMilestone.order}
                      </button>
                    ) : (
                      <span className="text-[13px] text-[#C9CCD2] text-center py-[11px]">
                        {total > 0 && completedCount === total ? "Path complete 🎉" : "No milestones yet"}
                      </span>
                    )}
                    {hasLocked && (
                      <span className="text-[11.5px] text-[#9BA1AD] text-center">
                        Some milestones need Premium
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 md:p-[34px] pb-24 md:pb-[34px] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] gap-7">
                  <div className="flex flex-col gap-2.5">
                    <div className="font-mono text-[11px] font-semibold tracking-[.16em] border-b-2 border-ink pb-[7px]">
                      MILESTONES
                    </div>

                    {error && (
                      <div className="px-4 py-2.5 bg-alert/10 border border-alert rounded-sm text-alert text-sm">
                        {error}
                      </div>
                    )}

                    {path.milestones.map((m) => {
                      const isCurrent = !m.completed && !m.locked;
                      return (
                        <div
                          key={m.id}
                          className={`flex gap-3.5 items-center rounded-[9px] px-4 py-[15px] ${
                            m.locked
                              ? "bg-[#FFFDF8] border border-[#E3D3A8]"
                              : isCurrent
                                ? "bg-white border-2 border-vermilion"
                                : "bg-white border border-border"
                          }`}
                        >
                          <div
                            className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 ${
                              m.completed
                                ? "bg-success text-white"
                                : m.locked
                                  ? "bg-[#F3E7C8] text-premium"
                                  : "border-2 border-vermilion text-vermilion font-mono text-[13px] font-semibold"
                            }`}
                          >
                            {m.completed ? "✓" : m.locked ? "🔒" : m.order}
                          </div>
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <span
                              className={`text-[15px] font-semibold ${m.locked ? "text-[#5C4A1E]" : ""}`}
                            >
                              {m.order} · {m.title}
                            </span>
                            <span
                              className={`text-[12.5px] ${m.locked ? "text-[#7A5B0F]" : "text-muted"}`}
                            >
                              {m.completed ? "Completed" : m.locked ? "Premium milestone" : "In progress"}
                            </span>
                          </div>
                          {m.completed && (
                            <span className="font-mono text-[11.5px] text-success font-semibold">
                              DONE
                            </span>
                          )}
                          {m.locked && (
                            <span className="bg-premium text-white text-[10px] font-semibold tracking-[.06em] px-2 py-1 rounded">
                              ★ PREMIUM
                            </span>
                          )}
                          {isCurrent && (
                            <button
                              onClick={() => handleComplete(m.id)}
                              className="bg-vermilion text-white text-[12.5px] font-semibold px-3.5 py-2 rounded-[6px]"
                            >
                              Mark complete
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-4">
                    {hasLocked && tier !== "PREMIUM" && (
                      <div className="bg-premium-bg border border-[#E3D3A8] rounded-[10px] p-5 flex flex-col gap-3">
                        <span className="self-start bg-premium text-white text-[10px] font-semibold tracking-[.06em] px-[9px] py-1 rounded">
                          ★ PREMIUM
                        </span>
                        <span className="font-display text-[25px] leading-[1.15] text-[#3E3110]">
                          Unlock the remaining milestones
                        </span>
                        <button
                          onClick={() => router.push("/settings")}
                          className="bg-premium text-white text-[13.5px] font-semibold py-3 rounded-[7px] text-center"
                        >
                          Upgrade to Premium
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
      <MobileTabBar />
    </div>
  );
}
