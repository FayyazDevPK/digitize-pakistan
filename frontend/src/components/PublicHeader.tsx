"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCurrentUser, CurrentUser } from "@/lib/auth";
import { getContentList, ContentItem } from "@/lib/content";
import PixelD from "@/components/PixelD";
import { SIGNUP_BONUS } from "@/lib/rewards";

const NAV_LINKS = [
  { label: "News", href: "/news" },
  { label: "AI Tools", href: "/tools" },
  { label: "Learn", href: "/my-learning" },
  { label: "Rewards", href: "/rewards" },
];

export default function PublicHeader({ active }: { active?: "News" | "AI Tools" }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [ticker, setTicker] = useState<ContentItem[]>([]);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
    getContentList("NEWS").then((items) => setTicker(items.slice(0, 2)));
  }, []);

  return (
    <div className="w-full font-sans">
      <div className="hidden md:flex bg-ink text-[#C9CFDC] items-center gap-6 px-12 h-9 text-xs">
        <span className="flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-light" />
          <span className="font-mono text-[10px] tracking-[.1em] text-primary-light">
            AI PULSE
          </span>
        </span>
        {ticker[0] && <span className="text-white truncate">{ticker[0].title}</span>}
        {ticker[1] && (
          <>
            <span className="text-[#24304A]">/</span>
            <span className="truncate hidden lg:inline">{ticker[1].title}</span>
          </>
        )}
        <span className="flex-1" />
        <span className="font-mono text-[11px] shrink-0">
          1,000 pts = <span className="text-marigold">Rs 250</span>
        </span>
      </div>

      <div className="bg-white border-b border-border flex items-center gap-6 md:gap-10 px-5 md:px-12 h-[76px]">
        <Link href="/news" className="flex items-center gap-2.5 shrink-0">
          <PixelD size={8} />
          <div className="flex items-baseline gap-1.5 leading-none text-ink">
            <span className="font-bold text-xl tracking-tight">Digitize</span>
            <span className="font-display italic text-2xl text-muted">Pakistan</span>
          </div>
        </Link>

        <nav className="hidden lg:flex gap-1 bg-paper p-1 rounded-xl">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={
                active === l.label
                  ? "text-sm font-semibold text-ink bg-white px-4 py-2 rounded-[9px] shadow-sm"
                  : "text-sm font-medium text-muted px-4 py-2 rounded-[9px]"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2.5 border border-border rounded-[11px] px-3 h-10 w-[220px] text-[#8A8F9C] text-sm">
          <span className="w-[11px] h-[11px] rounded-full border-[1.6px] border-[#8A8F9C] shrink-0" />
          <span className="flex-1 truncate">Search news &amp; tools</span>
          <span className="font-mono text-[10px] border border-border rounded px-[5px] py-[3px]">
            /
          </span>
        </div>

        {user === undefined ? (
          <div className="w-10 h-10 rounded-full bg-paper" aria-hidden="true" />
        ) : user ? (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-ink hidden sm:inline">
              {user.display_name || user.username}
            </span>
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-ink text-sm font-bold shrink-0">
              {(user.display_name || user.username).charAt(0).toUpperCase()}
            </div>
          </Link>
        ) : (
          <>
            <Link href="/login" className="text-sm font-semibold text-ink hidden sm:inline">
              Log in
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2.5 bg-primary text-white text-sm font-semibold px-4 h-[42px] rounded-[11px] shrink-0"
            >
              Start earning
              <span className="font-mono text-[10px] font-semibold bg-marigold text-ink px-1.5 py-1 rounded">
                +{SIGNUP_BONUS}
              </span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
