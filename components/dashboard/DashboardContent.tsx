"use client";

import {
  CalendarDays, CheckSquare, Clock, Users,
  ArrowUpRight, ArrowRight, TrendingUp, AlertTriangle, Inbox,
} from "lucide-react";
import { getRoleLabel } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { cn } from "@/lib/utils";
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
  Overdue:     { label: "Overdue",     color: "bg-red-500/15 text-red-400 border-red-500/25" },
  Open:        { label: "Open",        color: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  "In Progress":{ label: "In Progress", color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  Completed:   { label: "Completed",   color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  Cancelled:   { label: "Cancelled",   color: "bg-white/10 text-white/40 border-white/10" },
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
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  /* KPI cards built from real data */
  const kpiCards = [
    {
      label: "Upcoming Meetings",
      value: String(upcomingMeetings.length),
      change: upcomingMeetings.length === 0 ? "None scheduled" : `${upcomingMeetings.length} scheduled`,
      trend: upcomingMeetings.length > 0 ? "up" : "neutral",
      icon: CalendarDays,
      gradient: "linear-gradient(135deg, #4f46e5, #7c3aed)",
      glow: "rgba(79,70,229,0.2)",
      href: "/meetings",
    },
    {
      label: "Pending RSVPs",
      value: String(pendingRsvpCount),
      change: pendingRsvpCount === 0 ? "All responded" : `${pendingRsvpCount} awaiting your response`,
      trend: pendingRsvpCount > 0 ? "warn" : "neutral",
      icon: Clock,
      gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
      glow: "rgba(245,158,11,0.2)",
      href: "/meetings",
    },
    {
      label: "Open Action Items",
      value: String(openActionCount),
      change: overdueActionCount > 0 ? `${overdueActionCount} overdue` : "All on track",
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
      change: boardMemberCount === 1 ? "1 active member" : `${boardMemberCount} active members`,
      trend: "neutral",
      icon: Users,
      gradient: "linear-gradient(135deg, #10b981, #059669)",
      glow: "rgba(16,185,129,0.2)",
      href: "/users",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-700 text-white">
            {greeting}, {user.name?.split(" ")[0]} 👋
          </h2>
          <p className="text-sm text-white/40 mt-1">
            {getRoleLabel(user.role as UserRole)} ·{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Link
          href="/meetings/new"
          className="btn-gradient flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600 hidden md:flex"
        >
          <CalendarDays size={15} />
          New Meeting
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group block"
            style={{
              background: "var(--bg-card)",
              animationDelay: `${i * 0.07}s`,
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: card.gradient, boxShadow: `0 8px 24px ${card.glow}` }}
              >
                <card.icon size={18} className="text-white" />
              </div>
              <ArrowUpRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
            </div>
            <div className="text-3xl font-800 text-white mb-1">{card.value}</div>
            <div className="text-sm text-white/50 mb-1">{card.label}</div>
            <div
              className={cn(
                "text-xs flex items-center gap-1",
                card.trend === "up"
                  ? "text-emerald-400"
                  : card.trend === "warn" || card.trend === "down"
                  ? "text-amber-400"
                  : "text-white/30"
              )}
            >
              {card.trend === "up" && <TrendingUp size={11} />}
              {(card.trend === "warn" || card.trend === "down") && <AlertTriangle size={11} />}
              {card.change}
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Upcoming Meetings */}
        <div
          className="rounded-2xl p-5 border border-white/[0.06]"
          style={{ background: "var(--bg-card)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-600 text-white text-sm">Upcoming Meetings</h3>
            <Link
              href="/meetings"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
            {upcomingMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/30">
                <Inbox size={28} />
                <p className="text-sm">No upcoming meetings</p>
              </div>
            ) : (
              upcomingMeetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all cursor-pointer"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--gradient-brand)", opacity: 0.85 }}
                  >
                    <CalendarDays size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 text-white truncate">{m.title}</p>
                    <p className="text-xs text-white/40">
                      {m.date} · {m.startTime}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={cn(
                        "badge text-[10px]",
                        m.status === "In Progress"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                          : "bg-indigo-500/15 text-indigo-400 border-indigo-500/25"
                      )}
                    >
                      {m.status === "In Progress" ? "● Live" : m.meetingType}
                    </span>
                    {m.attendees > 0 && (
                      <p className="text-[10px] text-white/30 mt-1">{m.attendees} attendee{m.attendees !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Action Items */}
        <div
          className="rounded-2xl p-5 border border-white/[0.06] flex flex-col"
          style={{ background: "var(--bg-card)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-600 text-white text-sm">Recent Action Items</h3>
            <Link
              href="/actions"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
            {recentActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/30">
                <CheckSquare size={28} />
                <p className="text-sm">No open action items</p>
              </div>
            ) : (
              recentActions.map((a) => {
                const s = actionStatusConfig[a.status] ?? actionStatusConfig["Open"];
                const isAssignedToMe = a.assigneeId === currentUserId;
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all"
                  >
                    <CheckSquare
                      size={16}
                      className={cn(
                        "flex-shrink-0",
                        a.status === "Overdue" ? "text-red-400" : "text-white/30"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-500 text-white/90 truncate">{a.title}</p>
                      <p className="text-xs text-white/40">
                        {isAssignedToMe ? (
                          <span className="text-indigo-400">You</span>
                        ) : (
                          a.assigneeName
                        )}
                        {a.dueDate && ` · Due ${a.dueDate}`}
                      </p>
                    </div>
                    <span className={`badge ${s.color} text-[10px] flex-shrink-0`}>{s.label}</span>
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
