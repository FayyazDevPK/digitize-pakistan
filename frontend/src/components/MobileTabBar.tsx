"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authFetch } from "@/lib/auth";

const TABS = [
  { label: "Home", href: "/news" },
  { label: "Learn", href: "/my-learning" },
  { label: "Refer", href: "/referrals" },
  { label: "More", href: "/notifications" },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    authFetch("/api/rewards/balance/")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setBalance(Number(data.balance));
      })
      .catch(() => {});
  }, []);

  const active = (href: string) => pathname?.startsWith(href);

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-border grid grid-cols-5 items-end px-2.5 pt-2 pb-6 text-[11px] font-semibold text-[#8A8F9C] z-10">
      <Link href={TABS[0].href} className="flex flex-col items-center gap-[5px]">
        <span
          className={`w-[22px] h-1 rounded-full ${active(TABS[0].href) ? "bg-primary" : "bg-transparent"}`}
        />
        <span className={active(TABS[0].href) ? "text-ink" : ""}>{TABS[0].label}</span>
      </Link>
      <Link href={TABS[1].href} className="flex flex-col items-center gap-[5px]">
        <span
          className={`w-[22px] h-1 rounded-full ${active(TABS[1].href) ? "bg-primary" : "bg-transparent"}`}
        />
        <span className={active(TABS[1].href) ? "text-ink" : ""}>{TABS[1].label}</span>
      </Link>
      <Link href="/rewards" className="flex flex-col items-center gap-1 -mt-[26px]">
        <span className="w-[58px] h-[58px] rounded-[18px] bg-ink border-4 border-paper flex items-center justify-center font-mono text-xs font-semibold text-marigold">
          {balance !== null
            ? balance >= 1000
              ? `${(balance / 1000).toFixed(1)}k`
              : balance
            : "—"}
        </span>
        <span className={active("/rewards") ? "text-ink" : ""}>Earn</span>
      </Link>
      <Link href={TABS[2].href} className="flex flex-col items-center gap-[5px]">
        <span
          className={`w-[22px] h-1 rounded-full ${active(TABS[2].href) ? "bg-primary" : "bg-transparent"}`}
        />
        <span className={active(TABS[2].href) ? "text-ink" : ""}>{TABS[2].label}</span>
      </Link>
      <Link href={TABS[3].href} className="flex flex-col items-center gap-[5px]">
        <span
          className={`w-[22px] h-1 rounded-full ${active(TABS[3].href) ? "bg-primary" : "bg-transparent"}`}
        />
        <span className={active(TABS[3].href) ? "text-ink" : ""}>{TABS[3].label}</span>
      </Link>
    </div>
  );
}
