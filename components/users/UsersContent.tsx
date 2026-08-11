"use client";

import { useState } from "react";
import {
  Search, Plus, MoreVertical, Mail, Shield,
  CheckCircle2, XCircle, Clock, Edit2, Trash2, Eye,
} from "lucide-react";
import { getRoleLabel, getRoleColor } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { getInitials, cn } from "@/lib/utils";

// Demo data — will be replaced by API call in Phase 2
const DEMO_USERS = [
  { _id: "1", name: "Alexandra Chen", email: "a.chen@board.com", role: "super_admin" as UserRole, status: "active", department: "Executive", title: "CEO", lastLogin: "2026-08-08" },
  { _id: "2", name: "James Miller", email: "j.miller@board.com", role: "admin" as UserRole, status: "active", department: "Governance", title: "Board Chair", lastLogin: "2026-08-07" },
  { _id: "3", name: "Sarah Kim", email: "s.kim@board.com", role: "board_secretary" as UserRole, status: "active", department: "Legal", title: "Company Secretary", lastLogin: "2026-08-09" },
  { _id: "4", name: "Robert Davis", email: "r.davis@board.com", role: "board_member" as UserRole, status: "active", department: "Finance", title: "CFO", lastLogin: "2026-08-05" },
  { _id: "5", name: "Emma Wilson", email: "e.wilson@board.com", role: "board_member" as UserRole, status: "inactive", department: "Operations", title: "COO", lastLogin: "2026-07-20" },
  { _id: "6", name: "Michael Lee", email: "m.lee@board.com", role: "guest" as UserRole, status: "pending", department: "External", title: "Consultant", lastLogin: undefined },
];

const statusConfig = {
  active: { label: "Active", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  inactive: { label: "Inactive", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  pending: { label: "Pending", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
};

type StatusKey = keyof typeof statusConfig;

const avatarGradients = [
  "linear-gradient(135deg,#4f46e5,#7c3aed)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
  "linear-gradient(135deg,#ef4444,#dc2626)",
  "linear-gradient(135deg,#ec4899,#db2777)",
];

export default function UsersContent() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = DEMO_USERS.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/40 mt-0.5">{DEMO_USERS.length} total members · {DEMO_USERS.filter((u) => u.status === "active").length} active</p>
        </div>
        <button
          id="invite-user-btn"
          className="btn-gradient flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600 self-start sm:self-auto"
        >
          <Plus size={15} />
          Invite User
        </button>
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-4 border border-white/[0.06] flex flex-col sm:flex-row gap-3"
        style={{ background: "var(--bg-card)" }}
      >
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            id="user-search"
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
        <select
          id="role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/70 focus:outline-none focus:border-indigo-500/50 transition-all"
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="board_secretary">Board Secretary</option>
          <option value="board_member">Board Member</option>
          <option value="guest">Guest</option>
        </select>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/70 focus:outline-none focus:border-indigo-500/50 transition-all"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Users table */}
      <div
        className="rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ background: "var(--bg-card)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Member", "Role", "Department", "Status", "Last Active", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-600 text-white/35 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((user, i) => {
                const status = statusConfig[user.status as StatusKey];
                return (
                  <tr key={user._id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-700 text-white flex-shrink-0"
                          style={{ background: avatarGradients[i % avatarGradients.length] }}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="text-sm font-600 text-white">{user.name}</p>
                          <div className="flex items-center gap-1 text-xs text-white/40">
                            <Mail size={11} />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("badge text-[11px]", getRoleColor(user.role))}>
                        <Shield size={10} />
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm text-white/70">{user.department}</p>
                        <p className="text-xs text-white/35">{user.title}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("badge text-[11px]", status.bg)}>
                        <status.icon size={10} className={status.color} />
                        <span className={status.color}>{status.label}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-white/40">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all" title="View">
                          <Eye size={13} />
                        </button>
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all" title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-500/[0.08] transition-all" title="Remove">
                          <Trash2 size={13} />
                        </button>
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all" title="More">
                          <MoreVertical size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-white/30 text-sm">
                    No users match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
