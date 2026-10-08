"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCurrentUser, CurrentUser } from "@/lib/auth";
import {
  PATH_COMPLETION_BONUS,
  READ_REWARD,
  REFERRAL_BONUS,
  SIGNUP_BONUS,
} from "@/lib/rewards";

const ACTIONS = [
  { label: "Verify your email", pts: `+${SIGNUP_BONUS}` },
  { label: "Read an article", pts: `+${READ_REWARD.free} (Premium +${READ_REWARD.premium})` },
  { label: "Finish a learning path", pts: `+${PATH_COMPLETION_BONUS}` },
  {
    label: "Friend qualifies (you earn)",
    pts: `+${REFERRAL_BONUS.free} (Premium +${REFERRAL_BONUS.premium})`,
  },
];

export default function ReadToEarnCard() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

  if (user === undefined) {
    return (
      <div className="bg-ink rounded-[20px] p-7 flex flex-col gap-3" aria-hidden="true">
        <div className="h-[11px] w-40 rounded-full bg-white/10" />
        <div className="h-[38px] w-4/5 rounded-md bg-white/10" />
        <div className="h-14 w-full rounded-[14px] bg-white/10" />
        <div className="h-10 w-full rounded-[12px] bg-white/10 mt-1" />
      </div>
    );
  }

  return (
    <div className="bg-ink text-white rounded-[20px] p-7 flex flex-col gap-5">
      <span className="font-mono text-[11px] tracking-[.12em] text-primary-light">
        THE DIGITIZE ECONOMY
      </span>
      <h3 className="font-display text-[38px] leading-[1.02] m-0">
        {user ? (
          <>Welcome back, {user.display_name || user.username}.</>
        ) : (
          <>
            Your time is worth something. <span className="italic text-marigold">We pay it.</span>
          </>
        )}
      </h3>
      <div className="bg-ink-raised border border-[#24304A] rounded-[14px] px-4 py-4 flex items-baseline justify-between">
        <span className="font-mono text-2xl font-semibold">
          1,000<span className="text-xs text-muted-2"> pts</span>
        </span>
        <span className="text-[#6E7890]">→</span>
        <span className="font-mono text-2xl font-semibold text-marigold">Rs 250</span>
      </div>
      <div className="flex flex-col">
        {ACTIONS.map((a) => (
          <div
            key={a.label}
            className="flex justify-between py-2.5 border-t border-[#24304A] text-sm"
          >
            <span>{a.label}</span>
            <span className="font-mono text-primary-light">{a.pts}</span>
          </div>
        ))}
      </div>
      <Link
        href={user ? "/dashboard" : "/register"}
        className="bg-primary-light text-ink font-bold text-[15px] text-center py-3.5 rounded-xl"
      >
        {user ? "Go to Dashboard" : "Start earning — it's free"}
      </Link>
      <span className="text-xs text-muted-2 leading-[1.5]">
        Cash withdrawals after identity verification, in line with State Bank of Pakistan rules.
      </span>
    </div>
  );
}
