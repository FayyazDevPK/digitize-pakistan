"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import { formatPoints } from "@/lib/ledger";
import { READ_DAILY_CAP, READ_REWARD } from "@/lib/rewards";

interface ReadInfo {
  minSeconds: number;
  rewardPoints: number | null;
  dailyCap: number | null;
}

type Outcome =
  | { kind: "awarded"; points: number }
  | { kind: "already" }
  | { kind: "capped" }
  | { kind: "unavailable" };

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// The server is the real gate (minimum reading time, once per article, daily cap, throttle);
// this component only decides WHEN to ask: after the reader has reached the end of the article
// and the server-reported minimum time has elapsed.
export default function ArticleReadToEarn({ slug, targetId }: { slug: string; targetId: string }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [info, setInfo] = useState<ReadInfo | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [endReached, setEndReached] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notEligible, setNotEligible] = useState(false);
  const claiming = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

  // Open the read session as soon as a logged-in user is on the page.
  useEffect(() => {
    if (!user || started.current) return;
    started.current = true;
    authFetch("/api/rewards/read/start/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_slug: slug }),
    })
      .then(async (res) => {
        if (!res.ok) {
          setNotEligible(true);
          return;
        }
        const data = await res.json();
        setInfo({
          minSeconds: data.min_seconds,
          rewardPoints: data.reward_points === null ? null : Number(data.reward_points),
          dailyCap: data.daily_cap === null ? null : Number(data.daily_cap),
        });
        setSecondsLeft(data.seconds_remaining);
        if (data.already_rewarded) setOutcome({ kind: "already" });
      })
      .catch(() => setNotEligible(true));
  }, [user, slug]);

  // Count the server-reported remaining time down.
  const timerRunning = secondsLeft !== null && secondsLeft > 0;
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s === null ? s : Math.max(0, s - 1)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  // Has the reader reached the end of the article?
  useEffect(() => {
    if (!user) return;
    function check() {
      const el = document.getElementById(targetId);
      if (!el) return;
      if (el.getBoundingClientRect().bottom <= window.innerHeight + 120) setEndReached(true);
    }
    const first = window.setTimeout(check, 0);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [user, targetId]);

  const timeReady = secondsLeft === 0;

  // Claim exactly once, when both conditions hold.
  useEffect(() => {
    if (!user || !info || outcome || !endReached || !timeReady || claiming.current) return;
    claiming.current = true;
    authFetch("/api/rewards/read/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_slug: slug }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.status === "awarded") {
          setOutcome({ kind: "awarded", points: Number(data.points) });
        } else if (res.ok && data.status === "already_claimed") {
          setOutcome({ kind: "already" });
        } else if (res.ok && data.status === "cap_reached") {
          setOutcome({ kind: "capped" });
        } else if (data.status === "too_soon") {
          // Server's clock disagrees with ours: wait the extra time and try again.
          setSecondsLeft(Number(data.seconds_remaining) || 5);
          claiming.current = false;
        } else {
          setOutcome({ kind: "unavailable" });
        }
      })
      .catch(() => setOutcome({ kind: "unavailable" }));
  }, [user, info, outcome, endReached, timeReady, slug]);

  if (user === undefined) {
    return (
      <div className="bg-ink rounded-[20px] p-6 flex flex-col gap-4" aria-hidden="true">
        <div className="h-[11px] w-28 rounded-full bg-white/10" />
        <div className="h-14 w-4/5 rounded-md bg-white/10" />
        <div className="h-12 w-full rounded-xl bg-white/10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-ink text-white rounded-[20px] p-6 flex flex-col gap-4">
        <span className="font-mono text-[11px] tracking-[.12em] text-primary-light">
          READ TO EARN
        </span>
        <span className="font-display text-2xl leading-[1.1]">
          Sign in to earn points for reading this.
        </span>
        <div className="bg-ink-raised border border-[#24304A] rounded-xl p-3 text-xs leading-[1.5] text-[#C9CFDC]">
          <Link href="/login" className="text-white font-semibold border-b border-primary-light">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="text-white font-semibold border-b border-primary-light">
            create a free account
          </Link>
          . Reads only count for signed-in readers: free accounts earn {READ_REWARD.free} points per
          article (up to {READ_DAILY_CAP.free} a day).
        </div>
      </div>
    );
  }

  const pts = info?.rewardPoints;
  let headline = "Keep reading to earn points.";
  if (notEligible) headline = "This page doesn't earn reading points.";
  else if (outcome?.kind === "awarded") headline = `+${formatPoints(outcome.points)} points earned.`;
  else if (outcome?.kind === "already") headline = "Already earned for this article.";
  else if (outcome?.kind === "capped") headline = "Daily cap reached.";
  else if (outcome?.kind === "unavailable") headline = "Couldn't credit this read.";
  else if (pts) headline = `Read to the end to earn ${formatPoints(pts)} points.`;

  let note: string | null = null;
  if (outcome?.kind === "capped") {
    note = "You've earned the maximum for today. This read is saved — come back tomorrow to claim it.";
  } else if (outcome?.kind === "unavailable") {
    note = "Something went wrong crediting this read. Try again later.";
  } else if (outcome?.kind === "already") {
    note = "Each article pays once.";
  }

  const showProgress = !notEligible && !outcome && info;

  return (
    <div className="bg-ink text-white rounded-[20px] p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[11px] tracking-[.12em] text-primary-light">
          READ TO EARN
        </span>
        {pts ? (
          <span className="font-mono text-[11px] font-semibold bg-marigold text-ink px-[7px] py-[5px] rounded-md">
            +{formatPoints(pts)} PTS
          </span>
        ) : null}
      </div>
      <span className="font-display text-2xl leading-[1.1]">{headline}</span>
      {showProgress && (
        <div className="flex flex-col text-[13px]">
          <div className="flex justify-between py-2.5 border-t border-[#24304A]">
            <span className="text-muted-2">Reach the end</span>
            <span className="font-mono">{endReached ? "✓" : "—"}</span>
          </div>
          <div className="flex justify-between py-2.5 border-t border-[#24304A]">
            <span className="text-muted-2">Time on page</span>
            <span className="font-mono">
              {timeReady ? "✓" : `${mmss(secondsLeft ?? info.minSeconds)} left`}
            </span>
          </div>
        </div>
      )}
      {info?.dailyCap && !outcome ? (
        <span className="text-xs text-muted-2">
          Up to {formatPoints(info.dailyCap)} points a day. Each article pays once.
        </span>
      ) : null}
      {note && <span className="text-xs text-[#C9CFDC] leading-[1.5]">{note}</span>}
    </div>
  );
}
