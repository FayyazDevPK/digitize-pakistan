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

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar tier={user.tier} />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-10 pb-24 md:pb-10">
        <div className="max-w-2xl flex flex-col gap-5">
          <h1 className="font-display text-3xl">My learning</h1>

          {paths.length === 0 && (
            <p className="font-mono text-sm text-muted">No learning paths yet.</p>
          )}

          <div className="flex flex-col gap-3.5">
            {paths.map((p) => {
              const pct =
                p.milestone_count > 0
                  ? Math.round((p.completed_count / p.milestone_count) * 100)
                  : 0;
              return (
                <button
                  key={p.id}
                  onClick={() => router.push(`/learning-paths/${p.slug}`)}
                  className="bg-white border border-border rounded-[10px] p-5 flex flex-col gap-3 text-left hover:border-border-strong transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xl">{p.title}</span>
                        {p.access_tier === "PREMIUM" && (
                          <span className="bg-premium text-white text-[10px] font-semibold tracking-[.06em] px-2 py-[3px] rounded shrink-0">
                            ★ PREMIUM
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-muted leading-[1.5]">{p.description}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted">
                        {p.is_started ? "In progress" : "Not started"}
                      </span>
                      <span className="font-mono text-muted">
                        {p.completed_count} / {p.milestone_count} milestones
                      </span>
                    </div>
                    <div className="h-[7px] bg-[#EDE9E1] rounded-full">
                      <div
                        className="h-[7px] bg-vermilion rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
