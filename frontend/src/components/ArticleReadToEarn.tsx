"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUser, CurrentUser } from "@/lib/auth";

export default function ArticleReadToEarn() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

  if (user === undefined) {
    return (
      <div className="bg-ink rounded-[20px] p-6 flex flex-col gap-4" aria-hidden="true">
        <div className="h-[11px] w-28 rounded-full bg-white/10" />
        <div className="h-14 w-4/5 rounded-md bg-white/10" />
        <div className="h-12 w-full rounded-xl bg-white/10" />
      </div>
    );
  }

  return (
    <div className="bg-ink text-white rounded-[20px] p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[11px] tracking-[.12em] text-primary-light">
          READ TO EARN
        </span>
        <span className="font-mono text-[11px] font-semibold bg-marigold text-ink px-[7px] py-[5px] rounded-md">
          +40 PTS
        </span>
      </div>
      <span className="font-display text-2xl leading-[1.1]">
        {user ? "Keep reading to earn 40 points." : "Keep reading to credit this article."}
      </span>
      {!user && (
        <div className="bg-ink-raised border border-[#24304A] rounded-xl p-3 text-xs leading-[1.5] text-[#C9CFDC]">
          Not signed in?{" "}
          <a href="/register" className="text-white font-semibold border-b border-primary-light">
            Create a free account
          </a>{" "}
          and this read counts.
        </div>
      )}
    </div>
  );
}
