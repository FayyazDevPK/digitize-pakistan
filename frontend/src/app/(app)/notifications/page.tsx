"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser, CurrentUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_STYLE: Record<string, { bg: string; text: string }> = {
  REWARD: { bg: "#FCEFCC", text: "#7A5300" },
  REFERRAL: { bg: "#E7E7FB", text: "#3A3BA8" },
  CREATOR: { bg: "#FCEFCC", text: "#7A5300" },
  CONTENT: { bg: "#DDF3E8", text: "#065C40" },
  SUBSCRIPTION: { bg: "#FCEFCC", text: "#7A5300" },
  KYC: { bg: "#ECECE6", text: "#454B5C" },
  SYSTEM: { bg: "#ECECE6", text: "#454B5C" },
};

const FILTER_GROUPS: { key: string; label: string; types: string[] }[] = [
  { key: "ALL", label: "All", types: [] },
  { key: "REWARD", label: "Rewards", types: ["REWARD"] },
  { key: "REFERRAL", label: "Referrals", types: ["REFERRAL"] },
  { key: "CONTENT", label: "Learning", types: ["CONTENT"] },
  { key: "CREATOR", label: "Creator", types: ["CREATOR"] },
  { key: "SYSTEM", label: "System", types: ["SYSTEM", "KYC", "SUBSCRIPTION"] },
];

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "Yesterday" : `${days} days`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  async function load() {
    const u = await fetchCurrentUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    const res = await authFetch("/api/notifications/");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAllRead() {
    await authFetch("/api/notifications/read-all/", { method: "POST" });
    load();
  }

  if (loading) return <p className="p-10 font-mono text-sm text-muted">Loading...</p>;
  if (!user) return null;

  const activeGroup = FILTER_GROUPS.find((g) => g.key === filter) ?? FILTER_GROUPS[0];
  const visibleNotifications =
    activeGroup.types.length === 0
      ? notifications
      : notifications.filter((n) => activeGroup.types.includes(n.type));

  return (
    <div className="min-h-screen flex bg-paper">
      <AppSidebar
        tier={user.tier}
        kycStatus={user.kyc_status}
        userName={user.display_name || user.username}
      />

      <div className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-8 pb-24 md:pb-10 flex flex-col gap-6 max-w-[980px]">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] tracking-[.12em] text-primary">
              NOTIFICATIONS · {unreadCount} UNREAD
            </span>
            <h1 className="font-display text-4xl md:text-5xl leading-none m-0">What&apos;s new</h1>
          </div>
          <button onClick={markAllRead} className="text-sm font-semibold">
            Mark all as read
          </button>
        </div>

        {notifications.length === 0 ? (
          <p className="font-mono text-sm text-muted">No notifications yet.</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {FILTER_GROUPS.map((g) => (
              <button
                key={g.key}
                onClick={() => setFilter(g.key)}
                className={`text-[13px] font-semibold px-3.5 py-2 rounded-full border transition-colors ${
                  filter === g.key
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-muted border-border hover:border-border-strong"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {notifications.length > 0 && visibleNotifications.length === 0 && (
          <p className="font-mono text-sm text-muted">No notifications in this category.</p>
        )}

        <div className="bg-white border border-border rounded-[22px] overflow-hidden">
          {visibleNotifications.map((n, i) => {
            const style = TYPE_STYLE[n.type] ?? { bg: "#ECECE6", text: "#454B5C" };
            return (
              <div
                key={n.id}
                className={`grid grid-cols-[12px_86px_minmax(0,1fr)_70px] sm:grid-cols-[12px_96px_minmax(0,1fr)_80px] gap-4 items-start px-4 sm:px-6 py-4 ${
                  i < visibleNotifications.length - 1 ? "border-b border-[#EFEEE8]" : ""
                } ${!n.is_read ? "bg-[#FBFBF7]" : ""}`}
              >
                <span
                  className={`w-2 h-2 rounded-full mt-1.5 ${!n.is_read ? "bg-primary" : ""}`}
                />
                <span
                  className="font-mono text-[10px] font-medium tracking-[.06em] px-[7px] py-[5px] rounded-md self-start truncate"
                  style={{ background: style.bg, color: style.text }}
                >
                  {n.type}
                </span>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className={`text-[15px] ${!n.is_read ? "font-bold" : "font-medium text-[#454B5C]"}`}>
                    {n.title}
                  </span>
                  {n.message && (
                    <span className={`text-sm ${!n.is_read ? "text-muted" : "text-muted-2"}`}>
                      {n.message}
                    </span>
                  )}
                </div>
                <span
                  className={`font-mono text-xs text-right ${!n.is_read ? "text-muted" : "text-muted-2"}`}
                >
                  {relativeTime(n.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <MobileTabBar />
    </div>
  );
}
