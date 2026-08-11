"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Calendar, CheckSquare, FileText, Settings, Trash2, CheckCheck, Loader2, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type NotifType = "meeting" | "action" | "document" | "system";

interface Notification {
  _id: string;
  type: NotifType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const ICON_MAP: Record<NotifType, { icon: React.ElementType; color: string; bg: string }> = {
  meeting: { icon: Calendar, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  action: { icon: CheckSquare, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  document: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
  system: { icon: Settings, color: "text-amber-400", bg: "bg-amber-500/10" },
};

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (res.ok) setNotifications(json.notifications || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const displayed = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  };

  const remove = async (id: string) => {
    await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-700 text-white">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-700 bg-indigo-500 text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-500 text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-30"
        >
          <CheckCheck size={16} /> Mark all read
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-white/[0.06]" style={{ background: "var(--bg-card)", width: "fit-content" }}>
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-500 capitalize transition-all",
              filter === f ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-white/50 hover:text-white/80"
            )}
          >
            {f} {f === "unread" && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "var(--bg-card)" }}>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-white/40">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-sm">Loading notifications…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
              <Bell size={24} className="text-white/20" />
            </div>
            <p className="text-sm text-white/40">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {displayed.map((n) => {
              const { icon: Icon, color, bg } = ICON_MAP[n.type] ?? ICON_MAP.system;
              const Inner = (
                <div
                  className={cn(
                    "flex items-start gap-4 p-4 sm:p-5 transition-colors group",
                    !n.read ? "bg-indigo-500/[0.03]" : "hover:bg-white/[0.02]"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5", bg)}>
                    <Icon size={18} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={cn("text-sm font-600", n.read ? "text-white/80" : "text-white")}>
                        {n.title}
                      </h3>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-white/50 mt-1 leading-relaxed">{n.body}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-white/30">{timeAgo(n.createdAt)}</p>
                      {n.link && n.type === "meeting" && (
                        <span className="text-xs text-indigo-400 flex items-center gap-1">
                          <Video size={11} /> Join meeting
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!n.read && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead(n._id); }}
                        title="Mark as read"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(n._id); }}
                      title="Dismiss"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );

              return n.link ? (
                <Link
                  key={n._id}
                  href={n.link}
                  onClick={() => { if (!n.read) markRead(n._id); }}
                  className="block hover:no-underline"
                >
                  {Inner}
                </Link>
              ) : (
                <div key={n._id}>{Inner}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
