"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCurrentUser, CurrentUser } from "@/lib/auth";

export default function ReadToEarnCard() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

  if (user === undefined) {
    return (
      <div
        className="bg-ink rounded-[10px] p-[22px] flex flex-col gap-3"
        aria-hidden="true"
      >
        <div className="h-[10.5px] w-24 rounded-full bg-white/10" />
        <div className="h-[26px] w-4/5 rounded-md bg-white/10" />
        <div className="h-[13.5px] w-full rounded-full bg-white/10" />
        <div className="h-[13.5px] w-2/3 rounded-full bg-white/10" />
        <div className="h-9 w-full rounded-[6px] bg-white/10 mt-1" />
      </div>
    );
  }

  return (
    <div className="bg-ink rounded-[10px] p-[22px] text-paper flex flex-col gap-3">
      <span className="font-mono text-[10.5px] font-semibold tracking-[.16em] text-[#FF7A52]">
        READ TO EARN
      </span>
      <div className="font-display text-[26px] leading-[1.15]">
        {user ? `Welcome back, ${user.display_name || user.username}.` : "Earn points for every article you finish."}
      </div>
      <p className="text-[13.5px] leading-[1.6] text-[#C9CCD2]">
        {user
          ? "Keep reading to keep earning — check your balance on the dashboard."
          : "1,000 pts = Rs 250. Withdraw from Rs 2,000 once KYC is approved."}
      </p>
      <Link
        href={user ? "/dashboard" : "/register"}
        className="bg-vermilion text-white text-[13px] font-semibold py-2.5 px-3.5 rounded-[6px] text-center"
      >
        {user ? "Go to Dashboard" : "Create free account"}
      </Link>
    </div>
  );
}
