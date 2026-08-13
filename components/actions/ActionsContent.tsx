"use client";

import { useState, useMemo, useTransition } from "react";
import {
  AlertTriangle, Search,
  ChevronDown, Circle, CheckCircle2, XCircle, RotateCcw,
  CalendarDays,
  Inbox,
  TrendingUp, Zap, Target, BarChart3, ChevronRight,
  SortAsc, SortDesc,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────── */

export interface ActionItemData {
  id: string;
  title: string;
  description?: string;
  assigneeName: string;
  assigneeId: string;
  assigneeInitials: string;
  meetingTitle: string;
  meetingId: string;
  dueDate: string | null;
  dueDateRaw: string | null;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Completed" | "Cancelled" | "Overdue";
  createdAt: string;
  isAssignedToMe: boolean;
}

export interface ActionStats {
  total: number;
  open: number;
  inProgress: number;
  overdue: number;
  completed: number;
  completionRate: number;
}

interface ActionsContentProps {
  actions: ActionItemData[];
  stats: ActionStats;
  currentUserId: string;
  canUpdateAll: boolean;
}

/* ─── Config ──────────────────────────────────────────────────── */

const statusConfig = {
  Open: {
    label: "Open",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    dot: "bg-amber-400",
    textColor: "text-amber-400",
    icon: Circle,
  },
  "In Progress": {
    label: "In Progress",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    dot: "bg-blue-400",
    textColor: "text-blue-400",
    icon: RotateCcw,
  },
  Completed: {
    label: "Completed",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    dot: "bg-emerald-400",
    textColor: "text-emerald-400",
    icon: CheckCircle2,
  },
  Cancelled: {
    label: "Cancelled",
    color: "bg-white/10 text-white/40 border-white/10",
    dot: "bg-white/30",
    textColor: "text-white/40",
    icon: XCircle,
  },
  Overdue: {
    label: "Overdue",
    color: "bg-red-500/15 text-red-400 border-red-500/25",
    dot: "bg-red-400",
    textColor: "text-red-400",
    icon: AlertTriangle,
  },
};

const priorityConfig = {
  Low: { label: "Low", color: "text-slate-400", bars: 1 },
  Medium: { label: "Medium", color: "text-amber-400", bars: 2 },
  High: { label: "High", color: "text-orange-400", bars: 3 },
  Critical: { label: "Critical", color: "text-red-400", bars: 4 },
};

const priorityStripeColor = {
  Critical: "bg-red-400",
  High: "bg-orange-400",
  Medium: "bg-amber-400",
  Low: "bg-slate-500",
};

/* ─── Priority Bars ─────────────────────────────────────────── */

function PriorityBars({ priority }: { priority: keyof typeof priorityConfig }) {
  const cfg = priorityConfig[priority];
  const barColors: Record<string, string> = {
    Low: "bg-slate-400",
    Medium: "bg-amber-400",
    High: "bg-orange-400",
    Critical: "bg-red-400",
  };
  const activeColor = barColors[priority] ?? "bg-slate-400";

  return (
    <div className="flex items-end gap-[2px]" title={`${priority} priority`}>
      {([6, 9, 12, 15] as const).map((h, i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-sm transition-all",
            i < cfg.bars ? activeColor : "bg-white/10"
          )}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

/* ─── Action Card ───────────────────────────────────────────── */

function ActionCard({
  action,
  canUpdateAll,
  onStatusChange,
}: {
  action: ActionItemData;
  canUpdateAll: boolean;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [, startTransition] = useTransition();
  const s = statusConfig[action.status] ?? statusConfig["Open"];
  const p = priorityConfig[action.priority] ?? priorityConfig["Medium"];

  const isOverdue =
    action.dueDateRaw &&
    new Date(action.dueDateRaw) < new Date() &&
    action.status !== "Completed" &&
    action.status !== "Cancelled";

  const canEdit = canUpdateAll || action.isAssignedToMe;
  const nextStatuses = (["Open", "In Progress", "Completed", "Cancelled"] as const).filter(
    (st) => st !== action.status
  );

  function handleStatusChange(newStatus: string) {
    setMenuOpen(false);
    startTransition(() => onStatusChange(action.id, newStatus));
  }

  const stripeColor = priorityStripeColor[action.priority] ?? "bg-slate-500";

  return (
    <div
      className={cn(
        "group relative rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        action.status === "Completed"
          ? "border-white/[0.04] opacity-70 hover:opacity-90"
          : action.status === "Overdue"
          ? "border-red-500/20"
          : "border-white/[0.06] hover:border-white/[0.12]"
      )}
      style={{
        background:
          action.status === "Overdue"
            ? "linear-gradient(135deg, rgba(239,68,68,0.04) 0%, var(--bg-card) 60%)"
            : "var(--bg-card)",
        boxShadow:
          action.status === "Overdue"
            ? "0 4px 20px rgba(239,68,68,0.06)"
            : "0 2px 12px rgba(0,0,0,0.08)",
      }}
    >
      {/* Priority stripe */}
      <div className={cn("absolute left-0 top-3 bottom-3 w-0.5 rounded-full", stripeColor)} />

      <div className="pl-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-600 text-sm leading-snug mb-1",
                action.status === "Completed" ? "line-through text-white/40" : "text-white/90"
              )}
            >
              {action.title}
            </p>
            {action.description && (
              <p className="text-xs text-white/35 line-clamp-2 leading-relaxed">
                {action.description}
              </p>
            )}
          </div>

          {/* Status badge + dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => canEdit && setMenuOpen(!menuOpen)}
              disabled={!canEdit}
              className={cn(
                "badge text-[10px] flex items-center gap-1.5",
                s.color,
                canEdit ? "cursor-pointer hover:opacity-80 transition-opacity" : "cursor-default"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
              {s.label}
              {canEdit && <ChevronDown size={9} className="opacity-60" />}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-20 rounded-xl border border-white/[0.1] overflow-hidden shadow-2xl min-w-[140px]"
                  style={{ background: "var(--bg-secondary)" }}
                >
                  {nextStatuses.map((st) => {
                    const cfg = statusConfig[st];
                    return (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-white/[0.05] transition-colors flex items-center gap-2"
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                        <span className="text-white/70">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {/* Assignee */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-700 text-white flex-shrink-0"
              style={{
                background: action.isAssignedToMe
                  ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                  : "linear-gradient(135deg, #374151, #1f2937)",
              }}
            >
              {action.assigneeInitials}
            </div>
            <span
              className={cn(
                "text-xs",
                action.isAssignedToMe ? "text-indigo-400 font-500" : "text-white/40"
              )}
            >
              {action.isAssignedToMe ? "You" : action.assigneeName}
            </span>
          </div>

          {/* Due date */}
          {action.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue ? "text-red-400" : "text-white/40"
              )}
            >
              <CalendarDays size={11} />
              <span>
                {isOverdue ? "Overdue · " : ""}
                {action.dueDate}
              </span>
            </div>
          )}

          {/* Priority */}
          <div className="flex items-center gap-1.5">
            <PriorityBars priority={action.priority} />
            <span className={cn("text-xs", p.color)}>{p.label}</span>
          </div>

          {/* Meeting link */}
          <Link
            href={`/meetings/${action.meetingId}`}
            className="flex items-center gap-1 text-xs text-white/30 hover:text-indigo-400 transition-colors ml-auto"
          >
            <CalendarDays size={10} />
            <span className="truncate max-w-[120px]">{action.meetingTitle}</span>
            <ChevronRight size={10} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  glow,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  glow: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 border border-white/[0.06] flex flex-col gap-3"
      style={{ background: "var(--bg-card)" }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: gradient, boxShadow: `0 8px 20px ${glow}` }}
      >
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-800 text-white">{value}</div>
        <div className="text-xs text-white/45 mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-white/25 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */

export default function ActionsContent({
  actions,
  stats,
  currentUserId,
  canUpdateAll,
}: ActionsContentProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "status" | "createdAt">("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [localActions, setLocalActions] = useState<ActionItemData[]>(actions);

  // Optimistic status update
  async function handleStatusChange(id: string, newStatus: string) {
    setLocalActions((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: newStatus as ActionItemData["status"] } : a
      )
    );
    try {
      const res = await fetch(`/api/actions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) setLocalActions(actions);
    } catch {
      setLocalActions(actions);
    }
  }

  const priorityOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  const statusOrder: Record<string, number> = {
    Overdue: 5,
    "In Progress": 4,
    Open: 3,
    Completed: 2,
    Cancelled: 1,
  };

  const filtered = useMemo(() => {
    let result = [...localActions];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.assigneeName.toLowerCase().includes(q) ||
          a.meetingTitle.toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") result = result.filter((a) => a.status === filterStatus);
    if (filterPriority !== "all") result = result.filter((a) => a.priority === filterPriority);
    if (filterAssignee === "mine") result = result.filter((a) => a.isAssignedToMe);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "dueDate") {
        const da = a.dueDateRaw ? new Date(a.dueDateRaw).getTime() : Infinity;
        const db = b.dueDateRaw ? new Date(b.dueDateRaw).getTime() : Infinity;
        cmp = da - db;
      } else if (sortBy === "priority") {
        cmp = (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0);
      } else if (sortBy === "status") {
        cmp = (statusOrder[b.status] ?? 0) - (statusOrder[a.status] ?? 0);
      } else {
        cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [localActions, search, filterStatus, filterPriority, filterAssignee, sortBy, sortDir]);

  const grouped = useMemo(() => {
    const g: Record<string, ActionItemData[]> = {
      Overdue: [],
      "In Progress": [],
      Open: [],
      Completed: [],
      Cancelled: [],
    };
    filtered.forEach((a) => {
      if (g[a.status]) g[a.status].push(a);
      else g["Open"].push(a);
    });
    return g;
  }, [filtered]);

  const activeFiltersCount = [
    filterStatus !== "all",
    filterPriority !== "all",
    filterAssignee !== "all",
  ].filter(Boolean).length;

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-700 text-white flex items-center gap-2 flex-wrap">
            My Actions
            {stats.overdue > 0 && (
              <span className="badge bg-red-500/15 text-red-400 border-red-500/25 text-[10px]">
                {stats.overdue} overdue
              </span>
            )}
          </h2>
          <p className="text-sm text-white/40 mt-1">
            Track and manage your assigned action items across all meetings
          </p>
        </div>
      </div>

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard
          label="Total Actions"
          value={stats.total}
          icon={Target}
          gradient="linear-gradient(135deg, #4f46e5, #7c3aed)"
          glow="rgba(79,70,229,0.2)"
        />
        <StatCard
          label="Open"
          value={stats.open}
          icon={Circle}
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
          glow="rgba(245,158,11,0.2)"
          sub="Awaiting action"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={Zap}
          gradient="linear-gradient(135deg, #3b82f6, #2563eb)"
          glow="rgba(59,130,246,0.2)"
          sub="Currently active"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          gradient={
            stats.overdue > 0
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, #374151, #1f2937)"
          }
          glow={stats.overdue > 0 ? "rgba(239,68,68,0.25)" : "rgba(0,0,0,0)"}
          sub={stats.overdue > 0 ? "Needs attention" : "All on track"}
        />
        <StatCard
          label="Completion Rate"
          value={`${stats.completionRate}%`}
          icon={TrendingUp}
          gradient="linear-gradient(135deg, #10b981, #059669)"
          glow="rgba(16,185,129,0.2)"
          sub={`${stats.completed} completed`}
        />
      </div>

      {/* ── Completion Progress Bar ── */}
      <div
        className="rounded-2xl p-4 border border-white/[0.06]"
        style={{ background: "var(--bg-card)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-white/40" />
            <span className="text-xs font-600 text-white/60">Overall Progress</span>
          </div>
          <span className="text-xs font-700 text-white/80">{stats.completionRate}% complete</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${stats.completionRate}%`,
              background: "linear-gradient(90deg, #4f46e5, #10b981)",
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
          {(
            [
              { label: "Overdue", color: "bg-red-400", count: stats.overdue },
              { label: "In Progress", color: "bg-blue-400", count: stats.inProgress },
              { label: "Open", color: "bg-amber-400", count: stats.open },
              { label: "Completed", color: "bg-emerald-400", count: stats.completed },
            ] as const
          ).map(({ label, color, count }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", color)} />
              <span className="text-[10px] text-white/35">
                {label} ({count})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div
        className="rounded-2xl border border-white/[0.06] p-4"
        style={{ background: "var(--bg-card)" }}
      >
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search actions, assignees, meetings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white/80 placeholder-white/25 border border-white/[0.08] focus:outline-none focus:border-indigo-500/40 transition-colors"
              style={{ background: "var(--bg-secondary)" }}
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-white/[0.08] text-white/70 focus:outline-none focus:border-indigo-500/40 transition-colors"
            style={{ background: "var(--bg-secondary)" }}
          >
            <option value="all">All Statuses</option>
            <option value="Overdue">Overdue</option>
            <option value="In Progress">In Progress</option>
            <option value="Open">Open</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-white/[0.08] text-white/70 focus:outline-none focus:border-indigo-500/40 transition-colors"
            style={{ background: "var(--bg-secondary)" }}
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Assignee filter */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-white/[0.08] text-white/70 focus:outline-none focus:border-indigo-500/40 transition-colors"
            style={{ background: "var(--bg-secondary)" }}
          >
            <option value="all">All Assignees</option>
            <option value="mine">Assigned to Me</option>
          </select>

          {/* Sort buttons */}
          <div className="flex items-center gap-1">
            {(["dueDate", "priority", "status"] as const).map((field) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs border transition-all flex items-center gap-1",
                  sortBy === field
                    ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400"
                    : "border-white/[0.06] text-white/35 hover:text-white/60 hover:border-white/[0.1]"
                )}
              >
                {field === "dueDate" ? "Due Date" : field === "priority" ? "Priority" : "Status"}
                {sortBy === field &&
                  (sortDir === "asc" ? <SortAsc size={10} /> : <SortDesc size={10} />)}
              </button>
            ))}
          </div>

          {/* Clear filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setFilterStatus("all");
                setFilterPriority("all");
                setFilterAssignee("all");
              }}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <XCircle size={12} />
              Clear {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      {/* ── Actions List ── */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl border border-white/[0.06] p-16 flex flex-col items-center justify-center text-center"
          style={{ background: "var(--bg-card)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: "linear-gradient(135deg,rgba(79,70,229,0.15),rgba(124,58,237,0.08))",
              border: "1px solid rgba(79,70,229,0.2)",
            }}
          >
            <Inbox size={24} className="text-indigo-400" />
          </div>
          <h3 className="text-base font-600 text-white mb-1">No actions found</h3>
          <p className="text-sm text-white/35 max-w-xs">
            {search || activeFiltersCount > 0
              ? "Try adjusting your search or filters."
              : "You have no action items assigned to you yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(["Overdue", "In Progress", "Open", "Completed", "Cancelled"] as const).map((status) => {
            const groupItems = grouped[status];
            if (!groupItems || groupItems.length === 0) return null;
            const cfg = statusConfig[status];
            const StatusIcon = cfg.icon;
            return (
              <div key={status}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                  <StatusIcon size={13} className={cfg.textColor} />
                  <h3 className="text-xs font-600 text-white/50 uppercase tracking-widest">
                    {cfg.label}
                  </h3>
                  <span className="text-xs text-white/25">({groupItems.length})</span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {groupItems.map((action, i) => (
                    <div
                      key={action.id}
                      style={{ animationDelay: `${i * 0.04}s` }}
                      className="animate-fade-in"
                    >
                      <ActionCard
                        action={action}
                        canUpdateAll={canUpdateAll}
                        onStatusChange={handleStatusChange}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      {filtered.length > 0 && (
        <p className="text-center text-xs text-white/20 pb-2">
          Showing {filtered.length} of {localActions.length} action item
          {localActions.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
