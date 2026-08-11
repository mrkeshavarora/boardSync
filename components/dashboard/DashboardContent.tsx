"use client";

import {
  CalendarDays, CheckSquare, Clock, Users,
  ArrowUpRight, ArrowRight, TrendingUp, AlertTriangle,
} from "lucide-react";
import { getRoleLabel } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { cn } from "@/lib/utils";

interface DashboardContentProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

const kpiCards = [
  {
    label: "Upcoming Meetings",
    value: "4",
    change: "+2 this week",
    trend: "up",
    icon: CalendarDays,
    gradient: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    glow: "rgba(79,70,229,0.2)",
  },
  {
    label: "Pending RSVPs",
    value: "12",
    change: "3 overdue",
    trend: "warn",
    icon: Clock,
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    glow: "rgba(245,158,11,0.2)",
  },
  {
    label: "Open Action Items",
    value: "27",
    change: "5 overdue",
    trend: "down",
    icon: CheckSquare,
    gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
    glow: "rgba(239,68,68,0.2)",
  },
  {
    label: "Board Members",
    value: "18",
    change: "2 pending invite",
    trend: "neutral",
    icon: Users,
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    glow: "rgba(16,185,129,0.2)",
  },
];

const upcomingMeetings = [
  { title: "Q3 Strategy Review", date: "Aug 15, 2026", time: "10:00 AM", type: "Board Meeting", attendees: 12 },
  { title: "Finance Committee", date: "Aug 18, 2026", time: "2:00 PM", type: "Committee", attendees: 6 },
  { title: "Annual General Meeting", date: "Aug 22, 2026", time: "9:00 AM", type: "AGM", attendees: 24 },
];

const recentActions = [
  { title: "Submit Q2 financial report", assignee: "Sarah Chen", due: "Aug 10", status: "overdue" },
  { title: "Review governance policy draft", assignee: "James Miller", due: "Aug 14", status: "pending" },
  { title: "Prepare board presentation deck", assignee: "You", due: "Aug 15", status: "in_progress" },
  { title: "Update shareholder register", assignee: "Anna Park", due: "Aug 20", status: "pending" },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  overdue: { label: "Overdue", color: "bg-red-500/15 text-red-400 border-red-500/25" },
  pending: { label: "Pending", color: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  in_progress: { label: "In Progress", color: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  done: { label: "Done", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
};

export default function DashboardContent({ user }: DashboardContentProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-700 text-white">
            {greeting}, {user.name?.split(" ")[0]} 👋
          </h2>
          <p className="text-sm text-white/40 mt-1">
            {getRoleLabel(user.role as UserRole)} · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <a
          href="/meetings/new"
          className="btn-gradient flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600 hidden md:flex"
        >
          <CalendarDays size={15} />
          New Meeting
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div
            key={card.label}
            className="rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 hover:-translate-y-0.5 cursor-default group"
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
            <div className={cn("text-xs flex items-center gap-1", card.trend === "up" ? "text-emerald-400" : card.trend === "warn" || card.trend === "down" ? "text-amber-400" : "text-white/30")}>
              {card.trend === "up" && <TrendingUp size={11} />}
              {(card.trend === "warn" || card.trend === "down") && <AlertTriangle size={11} />}
              {card.change}
            </div>
          </div>
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
            <a href="/meetings" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </a>
          </div>
          <div className="space-y-3">
            {upcomingMeetings.map((m) => (
              <div
                key={m.title}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-center"
                  style={{ background: "var(--gradient-brand)", opacity: 0.85 }}
                >
                  <CalendarDays size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-600 text-white truncate">{m.title}</p>
                  <p className="text-xs text-white/40">{m.date} · {m.time}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="badge bg-indigo-500/15 text-indigo-400 border-indigo-500/25 text-[10px]">
                    {m.type}
                  </span>
                  <p className="text-[10px] text-white/30 mt-1">{m.attendees} attendees</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Actions */}
        <div
          className="rounded-2xl p-5 border border-white/[0.06]"
          style={{ background: "var(--bg-card)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-600 text-white text-sm">Recent Action Items</h3>
            <a href="/actions" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </a>
          </div>
          <div className="space-y-3">
            {recentActions.map((a) => {
              const s = statusConfig[a.status];
              return (
                <div
                  key={a.title}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all cursor-pointer"
                >
                  <CheckSquare size={16} className="text-white/30 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-500 text-white/90 truncate">{a.title}</p>
                    <p className="text-xs text-white/40">{a.assignee} · Due {a.due}</p>
                  </div>
                  <span className={`badge ${s.color} text-[10px] flex-shrink-0`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
