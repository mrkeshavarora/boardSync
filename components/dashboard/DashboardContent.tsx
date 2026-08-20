"use client";

import {
  CalendarDays, CheckSquare, Clock, Users,
  ArrowRight, TrendingUp, AlertTriangle, Inbox,
} from "lucide-react";
import { getRoleLabel } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { cn, toTitleCase } from "@/lib/utils";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────── */

interface UpcomingMeeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  meetingType: string;
  status: string;
  attendees: number;
}

interface RecentAction {
  id: string;
  title: string;
  assigneeName: string;
  assigneeId: string;
  dueDate: string | null;
  status: string;
  priority: string;
}

interface DashboardContentProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  upcomingMeetings: UpcomingMeeting[];
  openActionCount: number;
  overdueActionCount: number;
  recentActions: RecentAction[];
  boardMemberCount: number;
  pendingRsvpCount: number;
  currentUserId: string;
}

/* ─── Status config ──────────────────────────────────────────── */

const actionStatusConfig: Record<string, { label: string; color: string }> = {
  Overdue:     { label: "Overdue",     color: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/25" },
  Open:        { label: "Open",        color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/25" },
  "In Progress":{ label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25" },
  Completed:   { label: "Completed",   color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25" },
  Cancelled:   { label: "Cancelled",   color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-white/40 dark:border-white/10" },
};

/* ─── Component ──────────────────────────────────────────────── */

export default function DashboardContent({
  user,
  upcomingMeetings,
  openActionCount,
  overdueActionCount,
  recentActions,
  boardMemberCount,
  pendingRsvpCount,
  currentUserId,
}: DashboardContentProps) {
  const hour = new Date().getHours();
  const rawGreeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const greeting = toTitleCase(rawGreeting);

  /* KPI cards built from real data */
  const kpiCards = [
    {
      label: "Upcoming Meetings",
      value: String(upcomingMeetings.length),
      change: upcomingMeetings.length === 0 ? "None Scheduled" : `${upcomingMeetings.length} Scheduled`,
      trend: upcomingMeetings.length > 0 ? "up" : "neutral",
      icon: CalendarDays,
      gradient: "linear-gradient(135deg, #4f46e5, #7c3aed)",
      glow: "rgba(79,70,229,0.2)",
      href: "/meetings",
    },
    {
      label: "Pending RSVPs",
      value: String(pendingRsvpCount),
      change: pendingRsvpCount === 0 ? "All Responded" : `${pendingRsvpCount} Awaiting Your Response`,
      trend: pendingRsvpCount > 0 ? "warn" : "neutral",
      icon: Clock,
      gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
      glow: "rgba(245,158,11,0.2)",
      href: "/meetings",
    },
    {
      label: "Open Action Items",
      value: String(openActionCount),
      change: overdueActionCount > 0 ? `${overdueActionCount} Overdue` : "All On Track",
      trend: overdueActionCount > 0 ? "down" : openActionCount > 0 ? "warn" : "neutral",
      icon: CheckSquare,
      gradient: overdueActionCount > 0
        ? "linear-gradient(135deg, #ef4444, #dc2626)"
        : "linear-gradient(135deg, #10b981, #059669)",
      glow: overdueActionCount > 0 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
      href: "/actions",
    },
    {
      label: "Board Members",
      value: String(boardMemberCount),
      change: boardMemberCount === 1 ? "1 Active Member" : `${boardMemberCount} Active Members`,
      trend: "neutral",
      icon: Users,
      gradient: "linear-gradient(135deg, #10b981, #059669)",
      glow: "rgba(16,185,129,0.2)",
      href: "/users",
    },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-700 text-slate-900 dark:text-white capitalize">
            {greeting}, {toTitleCase(user.name?.split(" ")[0] || "")} 👋
          </h2>
          <p className="text-xs font-500 text-slate-600 dark:text-white/40 mt-0.5 capitalize">
            {toTitleCase(getRoleLabel(user.role as UserRole))} ·{" "}
            {toTitleCase(new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }))}
          </p>
        </div>
        <Link
          href="/meetings/new"
          className="btn-gradient flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-600 hidden md:flex cursor-pointer"
        >
          <CalendarDays size={14} />
          New Meeting
        </Link>
      </div>

      {/* KPI Cards (Ultra-Compact) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
        {kpiCards.map((card, i) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl p-3 border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group block bg-white dark:bg-[var(--bg-card)] shadow-2xs"
            style={{
              animationDelay: `${i * 0.07}s`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: card.gradient, boxShadow: `0 4px 12px ${card.glow}` }}
              >
                <card.icon size={14} className="text-white" />
              </div>
              <span className="text-xl font-800 text-slate-900 dark:text-white">{card.value}</span>
            </div>
            <div className="text-xs font-600 text-slate-800 dark:text-white/90 truncate capitalize">{toTitleCase(card.label)}</div>
            <div
              className={cn(
                "text-[10px] font-500 flex items-center gap-1 mt-0.5 truncate capitalize",
                card.trend === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : card.trend === "warn" || card.trend === "down"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-500 dark:text-white/30"
              )}
            >
              {card.trend === "up" && <TrendingUp size={10} />}
              {(card.trend === "warn" || card.trend === "down") && <AlertTriangle size={10} />}
              {toTitleCase(card.change)}
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">

        {/* Upcoming Meetings */}
        <div
          className="rounded-xl p-4 border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[var(--bg-card)] shadow-2xs"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-700 text-slate-900 dark:text-white text-xs sm:text-sm capitalize">Upcoming Meetings</h3>
            <Link
              href="/meetings"
              className="text-xs font-600 text-purple-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2 min-h-[280px] max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
            {upcomingMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 dark:text-white/30">
                <Inbox size={24} />
                <p className="text-xs font-500 capitalize">No Upcoming Meetings</p>
              </div>
            ) : (
              upcomingMeetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05] hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
                >
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: "var(--gradient-brand)", opacity: 0.85 }}
                  >
                    <CalendarDays size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-600 text-slate-900 dark:text-white truncate capitalize">{toTitleCase(m.title)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-white/40 capitalize">
                      {m.date} · {m.startTime}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-700 uppercase tracking-wide border",
                        m.status === "In Progress"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25"
                          : "bg-purple-100 text-purple-700 border-purple-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/25"
                      )}
                    >
                      {m.status === "In Progress" ? "● Live" : toTitleCase(m.meetingType)}
                    </span>
                    {m.attendees > 0 && (
                      <p className="text-[10px] text-slate-400 dark:text-white/30 mt-0.5 capitalize">{m.attendees} Attendee{m.attendees !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Action Items */}
        <div
          className="rounded-xl p-4 border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[var(--bg-card)] shadow-2xs flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-700 text-slate-900 dark:text-white text-xs sm:text-sm capitalize">Recent Action Items</h3>
            <Link
              href="/actions"
              className="text-xs font-600 text-purple-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2 min-h-[280px] max-h-[320px] overflow-y-auto pr-1 custom-scrollbar flex-1 flex flex-col">
            {recentActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 my-auto gap-2 text-slate-400 dark:text-white/30">
                <CheckSquare size={24} />
                <p className="text-xs font-500 capitalize">No Open Action Items</p>
              </div>
            ) : (
              recentActions.map((a) => {
                const s = actionStatusConfig[a.status] ?? actionStatusConfig["Open"];
                const isAssignedToMe = a.assigneeId === currentUserId;
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05] hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-all"
                  >
                    <CheckSquare
                      size={15}
                      className={cn(
                        "shrink-0",
                        a.status === "Overdue" ? "text-rose-500" : "text-slate-400 dark:text-white/30"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-600 text-slate-900 dark:text-white/90 truncate capitalize">{toTitleCase(a.title)}</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/40 capitalize">
                        {isAssignedToMe ? (
                          <span className="text-purple-600 dark:text-indigo-400 font-600">You</span>
                        ) : (
                          toTitleCase(a.assigneeName)
                        )}
                        {a.dueDate && ` · Due ${a.dueDate}`}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-700 uppercase tracking-wide border ${s.color} shrink-0`}>{toTitleCase(s.label)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
