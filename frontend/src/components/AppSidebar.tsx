"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "@/lib/auth";

const NAV_ITEMS: { label: string; href: string | null }[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "My learning", href: null },
  { label: "Rewards", href: "/rewards" },
  { label: "Referrals", href: "/referrals" },
  { label: "Saved tools", href: null },
  { label: "Creator studio", href: "/creator" },
  { label: "Settings", href: "/settings" },
];

export default function AppSidebar({ tier }: { tier?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearTokens();
    router.replace("/login");
  }

  return (
    <div className="hidden md:flex w-[214px] shrink-0 bg-ink px-4 py-[22px] flex-col gap-[22px] min-h-screen">
      <div className="flex items-center gap-[9px] px-1.5">
        <svg width="26" height="26" viewBox="0 0 46 46">
          <rect width="46" height="46" rx="9" fill="#FAF7F2" />
          <rect x="11" y="13" width="4" height="20" fill="#12151C" />
          <path d="M19 13h6a10 10 0 0 1 0 20h-6z" fill="none" stroke="#12151C" strokeWidth="4" />
          <circle cx="33.5" cy="33.5" r="3.5" fill="#E0512B" />
        </svg>
        <div className="flex flex-col leading-none">
          <span className="text-[14.5px] font-semibold text-paper tracking-tight">Digitize</span>
          <span className="font-mono text-[8px] font-medium tracking-[.22em] text-[#FF7A52] mt-[3px]">
            PAKISTAN
          </span>
        </div>
      </div>

      <nav className="flex flex-col gap-[3px] text-[13.5px]">
        {NAV_ITEMS.map((item) => {
          const active = item.href && pathname?.startsWith(item.href);
          if (!item.href) {
            return (
              <span key={item.label} className="text-[#6A7180] px-[11px] py-[9px] cursor-default">
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href}
              className={
                active
                  ? "bg-[#242935] text-paper px-[11px] py-[9px] rounded-[6px] font-medium border-l-2 border-vermilion"
                  : "text-[#B4B9C3] px-[11px] py-[9px] rounded-[6px] hover:bg-[#1C212B] transition-colors"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        {tier !== "PREMIUM" && (
          <div className="bg-[#1C212B] border border-[#2E3441] rounded-[8px] p-3.5 flex flex-col gap-2">
            <span className="self-start border border-[#6A7180] text-[#C9CCD2] text-[10px] font-semibold tracking-[.06em] px-[7px] py-[3px] rounded">
              FREE PLAN
            </span>
            <span className="text-[12.5px] text-[#D3D6DC] leading-[1.5]">
              Premium unlocks 7 paths and 2× read points.
            </span>
            <span className="bg-[#C48A1F] text-[#1A1403] text-xs font-bold py-2 rounded-[6px] text-center cursor-pointer">
              See Premium
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="text-[#8A8F9B] text-xs font-mono px-[11px] py-2 text-left hover:text-paper transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
