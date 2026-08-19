"use client";

import { useState } from "react";
import { 
  BarChart3, TrendingUp, Users, Calendar, Download, 
  CheckCircle2, Clock, AlertCircle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, trend, trendUp, icon: Icon, color
}: {
  label: string; value: string; sub: string;
  trend: string; trendUp: boolean;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="p-5 rounded-2xl border border-white/[0.06] flex flex-col gap-4" style={{ background: "var(--bg-card)" }}>
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
          <Icon size={20} />
        </div>
        <span className={cn(
          "flex items-center gap-1 text-xs font-600 px-2 py-1 rounded-full",
          trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
        )}>
          {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </span>
      </div>
      <div>
        <div className="text-2xl font-700 text-white">{value}</div>
        <div className="text-xs font-500 text-white/50 mt-0.5">{label}</div>
        <div className="text-xs text-white/30 mt-1">{sub}</div>
      </div>
    </div>
  );
}

// ─── Simple Bar Chart (CSS-based) ─────────────────────────────────────────────
const MONTHLY_DATA = [
  { month: "Mar", meetings: 4, actions: 12 },
  { month: "Apr", meetings: 6, actions: 18 },
  { month: "May", meetings: 5, actions: 14 },
  { month: "Jun", meetings: 8, actions: 24 },
  { month: "Jul", meetings: 7, actions: 20 },
  { month: "Aug", meetings: 9, actions: 28 },
];

function BarChartCss() {
  const maxVal = Math.max(...MONTHLY_DATA.map(d => d.actions));
  return (
    <div className="flex items-end justify-between gap-3 h-40 px-2">
      {MONTHLY_DATA.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex items-end gap-1 h-32">
            <div
              className="flex-1 rounded-t-md bg-indigo-500/30 border border-indigo-500/20 transition-all duration-500"
              style={{ height: `${(d.meetings / maxVal) * 100}%` }}
              title={`${d.meetings} meetings`}
            />
            <div
              className="flex-1 rounded-t-md bg-purple-500/30 border border-purple-500/20 transition-all duration-500"
              style={{ height: `${(d.actions / maxVal) * 100}%` }}
              title={`${d.actions} actions`}
            />
          </div>
          <span className="text-xs text-white/40">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Attendance Table ─────────────────────────────────────────────────────────
const ATTENDANCE = [
  { name: "Strategy Review", date: "Aug 15", invited: 12, attended: 10, rate: 83 },
  { name: "Finance Committee", date: "Aug 10", invited: 8, attended: 8, rate: 100 },
  { name: "Risk Assessment", date: "Jul 28", invited: 10, attended: 7, rate: 70 },
  { name: "Annual Planning", date: "Jul 15", invited: 12, attended: 11, rate: 92 },
  { name: "Mid-Year Review", date: "Jun 30", invited: 12, attended: 9, rate: 75 },
];

// ─── Action Items Summary ─────────────────────────────────────────────────────
const ACTION_STATUS = [
  { label: "Completed", count: 34, pct: 62, color: "bg-emerald-500" },
  { label: "In Progress", count: 13, pct: 24, color: "bg-blue-500" },
  { label: "Overdue", count: 8, pct: 14, color: "bg-red-500" },
];

export default function ReportsDashboard() {
  const [activeReport, setActiveReport] = useState<"overview" | "attendance" | "actions">("overview");

  const REPORT_TABS = [
    { id: "overview", label: "Overview" },
    { id: "attendance", label: "Attendance" },
    { id: "actions", label: "Action Items" },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-700 text-white">Reports & Analytics</h1>
          <p className="text-sm text-white/50 mt-1">Board meeting insights and performance metrics</p>
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-500 text-white/80 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors flex items-center gap-2 self-start sm:self-auto">
          <Download size={16} /> Export Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Meetings" value="39" sub="This fiscal year" trend="+22%" trendUp icon={Calendar} color="bg-indigo-500/10 text-indigo-400" />
        <StatCard label="Avg. Attendance" value="87%" sub="Across all meetings" trend="+5%" trendUp icon={Users} color="bg-blue-500/10 text-blue-400" />
        <StatCard label="Actions Completed" value="34/55" sub="62% completion rate" trend="+8%" trendUp icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-400" />
        <StatCard label="Overdue Actions" value="8" sub="Needs attention" trend="+3" trendUp={false} icon={AlertCircle} color="bg-red-500/10 text-red-400" />
      </div>

      {/* Report Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-white/[0.06]" style={{ background: "var(--bg-card)", width: "fit-content" }}>
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-500 transition-all",
              activeReport === tab.id
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                : "text-white/50 hover:text-white/80"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeReport === "overview" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <div className="lg:col-span-2 p-6 rounded-2xl border border-white/[0.06]" style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-600 text-white">Meeting & Action Trends</h2>
                <p className="text-xs text-white/40 mt-0.5">Last 6 months</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-white/50">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-indigo-500/50" /> Meetings</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-purple-500/50" /> Actions</span>
              </div>
            </div>
            <BarChartCss />
          </div>

          {/* Action Items Breakdown */}
          <div className="p-6 rounded-2xl border border-white/[0.06]" style={{ background: "var(--bg-card)" }}>
            <h2 className="text-base font-600 text-white mb-6">Action Items Status</h2>
            <div className="space-y-4">
              {ACTION_STATUS.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="text-white/70">{s.label}</span>
                    <span className="text-white font-600">{s.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", s.color)}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-white/30 mt-1">{s.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeReport === "attendance" && (
        <div className="p-6 rounded-2xl border border-white/[0.06]" style={{ background: "var(--bg-card)" }}>
          <h2 className="text-base font-600 text-white mb-4">Attendance by Meeting</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left pb-3 pr-4">Meeting</th>
                  <th className="text-left pb-3 pr-4">Date</th>
                  <th className="text-center pb-3 pr-4">Invited</th>
                  <th className="text-center pb-3 pr-4">Attended</th>
                  <th className="text-left pb-3">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {ATTENDANCE.map((row) => (
                  <tr key={row.name}>
                    <td className="py-3 pr-4 text-white font-500">{row.name}</td>
                    <td className="py-3 pr-4 text-white/50">{row.date}</td>
                    <td className="py-3 pr-4 text-white/70 text-center">{row.invited}</td>
                    <td className="py-3 pr-4 text-white/70 text-center">{row.attended}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 max-w-[100px] rounded-full bg-white/[0.05] overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", row.rate >= 90 ? "bg-emerald-500" : row.rate >= 75 ? "bg-blue-500" : "bg-amber-500")}
                            style={{ width: `${row.rate}%` }}
                          />
                        </div>
                        <span className={cn("text-xs font-600", row.rate >= 90 ? "text-emerald-400" : row.rate >= 75 ? "text-blue-400" : "text-amber-400")}>
                          {row.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions Tab */}
      {activeReport === "actions" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-white/[0.06] space-y-4" style={{ background: "var(--bg-card)" }}>
            <h2 className="text-base font-600 text-white">Open Action Items</h2>
            {[
              { title: "Draft Q4 Budget Proposal", owner: "Robert Davis", due: "Sep 01", overdue: false },
              { title: "Finalise shareholder report", owner: "Sarah Kim", due: "Aug 20", overdue: false },
              { title: "Confirm board retreat dates", owner: "Alexandra Chen", due: "Aug 10", overdue: true },
              { title: "Update risk register", owner: "James Miller", due: "Aug 05", overdue: true },
            ].map((a, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                <div>
                  <div className={cn("text-sm font-500", a.overdue ? "text-white/60" : "text-white")}>{a.title}</div>
                  <div className="text-xs text-white/40 mt-0.5">{a.owner}</div>
                </div>
                <span className={cn(
                  "badge text-xs",
                  a.overdue ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                )}>
                  {a.overdue ? <AlertCircle size={11} /> : <Clock size={11} />}
                  {a.overdue ? "Overdue" : `Due ${a.due}`}
                </span>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-2xl border border-white/[0.06] space-y-4" style={{ background: "var(--bg-card)" }}>
            <h2 className="text-base font-600 text-white">Completion by Assignee</h2>
            {[
              { name: "Robert Davis", completed: 8, total: 10 },
              { name: "Sarah Kim", completed: 12, total: 14 },
              { name: "James Miller", completed: 6, total: 11 },
              { name: "Alexandra Chen", completed: 5, total: 7 },
              { name: "Emily Zhang", completed: 3, total: 5 },
            ].map((p) => {
              const pct = Math.round((p.completed / p.total) * 100);
              return (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-white/70">{p.name}</span>
                    <span className="text-white/50 text-xs">{p.completed}/{p.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : "bg-amber-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
