"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authFetch, logout } from "@/lib/auth";
import { PREMIUM_PRICE_RS } from "@/lib/premium";
import { isEarningEntry } from "@/lib/ledger";
import PixelD from "@/components/PixelD";

interface NavItem {
  label: string;
  href: string;
  badge?: number;
}

export default function AppSidebar({
  tier,
  kycStatus,
  userName,
}: {
  tier?: string;
  kycStatus?: string;
  userName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [weekChange, setWeekChange] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    authFetch("/api/notifications/")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setUnreadCount(data.unread_count);
      })
      .catch(() => {});

    authFetch("/api/rewards/balance/")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        // The API sends `balance` as a bare number (0 for a fresh account), so a truthy check
        // here previously treated a real, correct 0 balance the same as "not loaded yet".
        setBalance(Number(data.balance));
        const gained = (data.recent_entries || [])
          .filter((e: { type: string }) => isEarningEntry(e.type))
          .reduce((sum: number, e: { amount: string }) => sum + Number(e.amount), 0);
        setWeekChange(gained);
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: "Earn",
      items: [
        { label: "Overview", href: "/dashboard" },
        { label: "My learning", href: "/my-learning" },
        { label: "Rewards", href: "/rewards" },
        { label: "Referrals", href: "/referrals" },
      ],
    },
    { title: "Create", items: [{ label: "Creator studio", href: "/creator" }] },
    {
      title: "Account",
      items: [
        { label: "Notifications", href: "/notifications", badge: unreadCount },
        { label: "Identity (KYC)", href: "/kyc" },
        { label: "Premium", href: "/premium" },
        { label: "Settings", href: "/settings" },
      ],
    },
  ];

  const rupees = balance !== null ? Math.round((balance / 1000) * 250) : 0;
  const initial = (userName || "?").charAt(0).toUpperCase();

  return (
    <div className="hidden md:flex w-[272px] shrink-0 p-3 min-h-screen">
      <div className="bg-ink rounded-[22px] flex-1 px-4 pt-[22px] pb-4 flex flex-col gap-[22px] text-white">
        <Link href="/news" className="flex items-center gap-2.5 px-1.5">
          <PixelD size={7} onDark />
          <div className="flex items-baseline gap-[5px] leading-none">
            <span className="font-bold text-[17px] tracking-tight">Digitize</span>
            <span className="font-display italic text-[19px] text-[#C9CFDC]">Pakistan</span>
          </div>
        </Link>

        <div className="bg-ink-raised border border-[#24304A] rounded-2xl px-3.5 pt-3.5 pb-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] tracking-[.1em] uppercase text-muted-2">
              Balance
            </span>
            {weekChange > 0 && (
              <span className="font-mono text-[10px] text-primary-light">
                +{weekChange.toLocaleString()} this wk
              </span>
            )}
          </div>
          <div className="font-mono text-2xl font-semibold text-marigold tracking-tight">
            {balance !== null ? balance.toLocaleString() : "—"}
            <span className="text-xs text-muted-2 ml-1.5">pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#C9CFDC]">≈ Rs {rupees.toLocaleString()}</span>
            <Link
              href="/rewards"
              className="text-xs font-semibold text-white border-b border-primary-light"
            >
              Withdraw
            </Link>
          </div>
        </div>

        <nav className="flex flex-col gap-[18px]">
          {groups.map((group) => (
            <div key={group.title} className="flex flex-col gap-0.5">
              <div className="font-mono text-[10px] tracking-[.12em] uppercase text-[#6E7890] px-2.5 pb-2">
                {group.title}
              </div>
              {group.items.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={
                      active
                        ? "flex items-center gap-3 px-2.5 py-2.5 rounded-[11px] bg-white text-ink"
                        : "flex items-center gap-3 px-2.5 py-2.5 rounded-[11px] text-[#C9CFDC] hover:bg-ink-raised hover:text-white transition-colors"
                    }
                  >
                    <span
                      className={`font-mono text-[10px] w-4 shrink-0 ${
                        active ? "font-semibold text-primary" : "text-[#6E7890]"
                      }`}
                    >
                      {String(groups.flatMap((g) => g.items).indexOf(item) + 1).padStart(2, "0")}
                    </span>
                    <span className={`text-sm flex-1 ${active ? "font-semibold" : "font-medium"}`}>
                      {item.label}
                    </span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-primary-light" />}
                    {!active && !!item.badge && (
                      <span className="font-mono text-[10px] font-semibold bg-marigold text-ink px-1.5 py-1 rounded-md">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex-1" />

        {kycStatus === "NONE" && (
          <div className="bg-ink-raised border border-[#24304A] rounded-2xl p-3.5 flex flex-col gap-2">
            <span className="self-start border border-[#6E7890] text-[#C9CFDC] text-[10px] font-semibold tracking-[.06em] px-[7px] py-[3px] rounded">
              NOT VERIFIED
            </span>
            <span className="text-[12.5px] text-[#C9CFDC] leading-[1.5]">
              Verify your identity to withdraw rewards.
            </span>
            <Link
              href="/kyc"
              className="bg-primary text-white text-xs font-bold py-2 rounded-[9px] text-center"
            >
              Verify now
            </Link>
          </div>
        )}
        {kycStatus === "PENDING" && (
          <div className="bg-ink-raised border border-marigold/60 rounded-2xl p-3.5 flex flex-col gap-2">
            <span className="self-start bg-premium-bg text-premium text-[10px] font-semibold tracking-[.06em] px-[7px] py-[3px] rounded">
              ⏳ PENDING
            </span>
            <span className="text-[12.5px] text-[#C9CFDC] leading-[1.5]">
              Verification pending review — you can keep earning while you wait.
            </span>
            <Link
              href="/kyc"
              className="border border-marigold text-marigold text-xs font-bold py-2 rounded-[9px] text-center"
            >
              View status
            </Link>
          </div>
        )}
        {kycStatus === "REJECTED" && (
          <div className="bg-ink-raised border border-alert rounded-2xl p-3.5 flex flex-col gap-2">
            <span className="self-start bg-alert-bg text-alert text-[10px] font-semibold tracking-[.06em] px-[7px] py-[3px] rounded">
              REJECTED
            </span>
            <span className="text-[12.5px] text-[#C9CFDC] leading-[1.5]">
              Verification was rejected — resubmit your documents.
            </span>
            <Link
              href="/kyc"
              className="bg-alert text-white text-xs font-bold py-2 rounded-[9px] text-center"
            >
              Resubmit
            </Link>
          </div>
        )}

        {tier !== "PREMIUM" && (
          <div className="rounded-2xl p-4 bg-marigold text-ink flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-[.1em] uppercase font-semibold">
              Premium
            </span>
            <span className="font-display text-[22px] leading-[1.05]">
              Earn more on every read.
            </span>
            <span className="text-xs leading-[1.4]">
              Unlock every learning path and higher point rates.
            </span>
            <Link
              href="/premium"
              className="mt-1 self-start bg-ink text-white text-xs font-semibold px-3 py-2 rounded-[9px]"
            >
              Upgrade · Rs {PREMIUM_PRICE_RS.toLocaleString()}/mo
            </Link>
          </div>
        )}

        <div className="relative border-t border-[#24304A] pt-2.5">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 px-1.5 py-1"
          >
            <div className="w-9 h-9 rounded-[11px] bg-primary-light text-ink flex items-center justify-center font-bold text-[13px] shrink-0">
              {initial}
            </div>
            <div className="flex-1 flex flex-col gap-0.5 text-left">
              <span className="text-[13px] font-semibold truncate">{userName || "Account"}</span>
              <span className="text-[11px] text-muted-2">
                {tier === "PREMIUM" ? "Premium" : "Free tier"}
                {kycStatus === "APPROVED" && (
                  <span className="text-primary-light"> · KYC verified</span>
                )}
              </span>
            </div>
            <span className="font-mono text-sm text-[#6E7890]">⋯</span>
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-1.5 right-1.5 mb-1 bg-ink-raised border border-[#24304A] rounded-[11px] overflow-hidden">
              <Link
                href="/settings"
                className="block px-3.5 py-2.5 text-[13px] text-[#C9CFDC] hover:bg-ink"
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3.5 py-2.5 text-[13px] text-rose hover:bg-ink"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
