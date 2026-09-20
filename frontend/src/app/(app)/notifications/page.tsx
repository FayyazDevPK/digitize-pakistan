"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, fetchCurrentUser } from "@/lib/auth";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const u = await fetchCurrentUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    const res = await authFetch("/api/notifications/");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
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

  return (
    <div className="max-w-lg mx-auto mt-16 px-4 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Notifications</h1>
        <button
          onClick={markAllRead}
          className="font-mono text-xs border border-border-strong rounded-sm px-3 py-1.5 hover:bg-paper-raised transition-colors"
        >
          Mark all read
        </button>
      </div>

      {notifications.length === 0 && (
        <p className="font-mono text-sm text-muted">No notifications yet.</p>
      )}

      <div className="bg-paper-raised border border-border rounded-md overflow-hidden">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`px-5 py-3 border-b border-border last:border-b-0 ${
              !n.is_read ? "bg-white" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-verified-bg text-verified border border-verified">
                {n.type}
              </span>
              {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-vermilion" />}
            </div>
            <div className="text-sm font-medium mt-1">{n.title}</div>
            {n.message && <div className="text-xs text-muted mt-0.5">{n.message}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
