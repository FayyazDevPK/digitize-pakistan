"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  content_slug: string | null;
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
  const [kycStatus, setKycStatus] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string | undefined>(undefined);
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
      setKycStatus(u.kyc_status);
      setUserName(u.display_name || u.username);
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
      <AppSidebar tier={tier} kycStatus={kycStatus} userName={userName} />

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
                <div className="px-6 md:px-10 pt-8 pb-4 flex flex-col gap-2.5">
                  <BackLink label="My learning" />
                  <div className="flex gap-2 font-mono text-[11px] tracking-[.1em] text-muted">
                    <span>MY LEARNING</span>
                    <span>/</span>
                    <span className="text-ink">{path.title.toUpperCase()}</span>
                  </div>
                </div>

                <div className="mx-6 md:mx-10 bg-ink text-white rounded-[24px] p-7 md:p-9 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8 items-end">
                  <div className="flex flex-col gap-3">
                    <span className="font-mono text-[11px] tracking-[.12em] text-primary-light">
                      {path.access_tier} · {total} MILESTONES
                    </span>
                    <h1 className="font-display text-4xl md:text-5xl leading-none m-0">
                      {path.title}
                    </h1>
                    <p className="text-base text-[#C9CFDC] leading-[1.5] max-w-[560px] m-0">
                      {path.description}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-baseline">
                      <span className="font-mono text-4xl font-semibold">{pct}%</span>
                      <span className="text-[13px] text-muted-2">
                        {completedCount} of {total} complete
                      </span>
                    </div>
                    <div
                      className="grid gap-1"
                      style={{ gridTemplateColumns: `repeat(${Math.max(total, 1)}, 1fr)` }}
                    >
                      {path.milestones.map((m) => (
                        <div
                          key={m.id}
                          className={`h-2 rounded-sm ${
                            m.completed
                              ? "bg-primary-light"
                              : m === nextMilestone
                                ? "bg-marigold"
                                : "bg-[#24304A]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-10 pb-24 md:pb-10 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] gap-6">
                  <div className="bg-white border border-border rounded-[22px] px-4 md:px-7 py-2">
                    {error && (
                      <div className="my-3 px-4 py-2.5 bg-alert-bg border border-alert rounded-lg text-alert text-sm">
                        {error}
                      </div>
                    )}
                    {path.milestones.map((m, i) => {
                      const isCurrent = !m.completed && !m.locked;
                      return (
                        <div
                          key={m.id}
                          className={
                            isCurrent
                              ? "grid grid-cols-[40px_1fr_auto] gap-4 items-center py-4 px-4 my-2 -mx-4 bg-premium-bg rounded-2xl"
                              : `grid grid-cols-[40px_1fr_auto] gap-4 items-center py-4 ${
                                  i < path.milestones.length - 1 ? "border-b border-[#EFEEE8]" : ""
                                } ${m.locked ? "opacity-60" : ""}`
                          }
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              m.completed
                                ? "bg-primary text-white text-[15px] font-bold"
                                : m.locked
                                  ? "border-[1.5px] border-dashed border-[#8A8F9C]"
                                  : "border-[3px] border-marigold bg-white"
                            }`}
                          >
                            {m.completed ? "✓" : m.locked ? "🔒" : <span className="w-2.5 h-2.5 rounded-full bg-ink" />}
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            {isCurrent && (
                              <span className="font-mono text-[10px] font-semibold tracking-[.1em] text-premium">
                                UP NEXT
                              </span>
                            )}
                            <span
                              className={
                                isCurrent
                                  ? "font-display text-2xl leading-[1.1]"
                                  : `text-[16px] font-semibold ${m.completed ? "text-muted" : ""}`
                              }
                            >
                              {m.title}
                            </span>
                            <span
                              className={`font-mono text-xs ${isCurrent ? "text-premium" : "text-muted-2"}`}
                            >
                              {String(m.order).padStart(2, "0")}
                              {m.is_free ? " · Free" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                          {m.content_slug && !m.locked && (
                            <Link
                              href={`/news/${m.content_slug}`}
                              className="text-xs font-semibold text-primary underline whitespace-nowrap"
                            >
                              Read lesson
                            </Link>
                          )}
                          {m.completed && (
                            <span className="text-xs font-semibold text-primary-deep bg-mint px-2.5 py-1.5 rounded-full">
                              Complete
                            </span>
                          )}
                          {m.locked && <span className="text-xs font-semibold text-muted">Locked</span>}
                          {isCurrent && (
                            <button
                              onClick={() => handleComplete(m.id)}
                              className="bg-ink text-white font-semibold text-sm px-4 py-3 rounded-xl"
                            >
                              Continue →
                            </button>
                          )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <aside className="flex flex-col gap-4">
                    {hasLocked && tier !== "PREMIUM" && (
                      <div className="bg-white border border-border rounded-[22px] p-6 flex flex-col gap-3">
                        <span className="self-start bg-premium text-white text-[10px] font-semibold tracking-[.06em] px-[9px] py-1 rounded">
                          ★ PREMIUM
                        </span>
                        <span className="font-display text-2xl leading-[1.15]">
                          Unlock the remaining milestones
                        </span>
                        <button
                          onClick={() => router.push("/premium")}
                          className="bg-premium text-white text-sm font-semibold py-3 rounded-xl text-center"
                        >
                          Upgrade to Premium
                        </button>
                      </div>
                    )}
                    {!nextMilestone && total > 0 && completedCount === total && (
                      <div className="bg-white border border-border rounded-[22px] p-6 text-center">
                        <span className="font-display text-2xl">Path complete 🎉</span>
                      </div>
                    )}
                  </aside>
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
