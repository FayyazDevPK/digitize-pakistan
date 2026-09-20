"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCurrentUser, CurrentUser } from "@/lib/auth";

const NAV_LINKS = [
  { label: "News", href: "/news" },
  { label: "AI Tools", href: "/tools" },
];

export default function PublicHeader({ active }: { active?: "News" | "AI Tools" }) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

  return (
    <div className="bg-ink px-5 md:px-7 h-14 flex items-center justify-between">
      <div className="flex items-center gap-6 md:gap-[26px]">
        <Link href="/news" className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 46 46">
            <rect width="46" height="46" rx="9" fill="#FAF7F2" />
            <rect x="11" y="13" width="4" height="20" fill="#12151C" />
            <path d="M19 13h6a10 10 0 0 1 0 20h-6z" fill="none" stroke="#12151C" strokeWidth="4" />
            <circle cx="33.5" cy="33.5" r="3.5" fill="#E0512B" />
          </svg>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[15px] font-semibold text-paper tracking-tight">Digitize</span>
            <span className="font-mono text-[8.5px] font-medium tracking-[.24em] text-[#FF7A52] mt-[3px]">
              PAKISTAN
            </span>
          </div>
        </Link>
        <div className="hidden md:flex gap-[22px] text-sm text-[#D3D6DC]">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={
                active === l.label
                  ? "text-paper font-medium border-b-2 border-vermilion pb-[3px]"
                  : ""
              }
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3.5">
        {user ? (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="text-sm text-[#D3D6DC] hidden sm:inline">
              {user.display_name || user.username}
            </span>
            <div className="w-8 h-8 rounded-full bg-[#3A404C] flex items-center justify-center text-paper text-xs font-semibold shrink-0">
              {(user.display_name || user.username).charAt(0).toUpperCase()}
            </div>
          </Link>
        ) : (
          <>
            <Link href="/login" className="text-sm text-[#D3D6DC] hidden sm:inline">
              Log in
            </Link>
            <Link
              href="/register"
              className="bg-vermilion text-white text-[13px] font-semibold px-3.5 py-2 rounded-[6px]"
            >
              Start earning
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
