"use client";

import { useEffect, useState } from "react";
import {
  Search, Plus, Mail, Shield, CheckCircle2, XCircle, Clock,
  Edit2, Trash2, Eye, Key, Loader2, X, Phone, Briefcase
} from "lucide-react";
import { getRoleLabel, getRoleColor } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { getInitials, cn } from "@/lib/utils";

interface UserType {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive" | "pending";
  department?: string;
  title?: string;
  phone?: string;
  lastLogin?: string;
  createdAt: string;
}

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
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "board_member" as UserRole,
    department: "",
    title: "",
    phone: ""
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        role: roleFilter,
        status: statusFilter,
        ...(search && { search })
      });
      const res = await fetch(`/api/users?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter, search]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inviteForm,
          status: "active" // directly active when admin invites/creates
        }),
      });
      if (res.ok) {
        setShowInviteModal(false);
        setInviteForm({
          name: "",
          email: "",
          password: "",
          role: "board_member",
          department: "",
          title: "",
          phone: ""
        });
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add user");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setShowPasswordModal(false);
        setNewPassword("");
        alert("Password updated successfully");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update password");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove "${userName}"?`)) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete user");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  console.log("UsersContent rendering. Total:", total, "Loading:", loading, "Users:", users.length);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Info */}
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-600 text-white/30 uppercase tracking-widest">{total} total members</span>
      </div>

      {/* Filters & Add Button */}
      <div
        className="rounded-2xl p-4 border border-white/[0.06] flex flex-col md:flex-row gap-3 items-stretch md:items-center"
        style={{ background: "var(--bg-card)" }}
      >
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/25 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/70 focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="board_secretary">Board Secretary</option>
          <option value="board_member">Board Member</option>
          <option value="guest">Guest</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/70 focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-gradient flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600 shrink-0"
        >
          <Plus size={15} />
          Add New User
        </button>
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-white/40">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-indigo-400" />
                      Loading users list...
                    </div>
                  </td>
                </tr>
              ) : users.map((user, i) => {
                const status = statusConfig[user.status as StatusKey] || statusConfig.active;
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
                        <p className="text-sm text-white/70">{user.department || "—"}</p>
                        <p className="text-xs text-white/35">{user.title || "—"}</p>
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
                        {user.status === "pending" && (
                          <button
                            onClick={() => handleUpdateStatus(user._id, "active")}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/[0.08] transition-all"
                            title="Approve User"
                          >
                            <CheckCircle2 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetailModal(true);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                          title="View Full Profile"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPasswordModal(true);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
                          title="Change Password"
                        >
                          <Key size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user._id, user.name)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
                          title="Remove Member"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && users.length === 0 && (
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

      {/* Invite/Add User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1021] border border-white/[0.08] rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="font-600 text-white text-base">Add New Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-white/45 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleInviteUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-white/50 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={inviteForm.password}
                    onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white/80 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="board_member">Board Member</option>
                    <option value="board_secretary">Board Secretary</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Department</label>
                  <input
                    type="text"
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1">Title / Designation</label>
                  <input
                    type="text"
                    value={inviteForm.title}
                    onChange={(e) => setInviteForm({ ...inviteForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-white/60 hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-gradient px-4 py-2 rounded-lg text-sm font-600 text-white flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1021] border border-white/[0.08] rounded-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="font-600 text-white text-base">Change Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-white/45 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <p className="text-sm text-white/40">
                You are updating the login credentials for **{selectedUser.name}** ({selectedUser.email}).
              </p>
              <div>
                <label className="text-xs text-white/50 block mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-white/60 hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-gradient px-4 py-2 rounded-lg text-sm font-600 text-white flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Profile Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1021] border border-white/[0.08] rounded-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="font-600 text-white text-base">User Details Profile</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-white/45 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Header profile */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-800 text-white"
                  style={{ background: avatarGradients[0] }}
                >
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h4 className="text-lg font-700 text-white">{selectedUser.name}</h4>
                  <span className={cn("badge text-[10px] mt-1.5 inline-flex", getRoleColor(selectedUser.role))}>
                    {getRoleLabel(selectedUser.role)}
                  </span>
                </div>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-1 gap-4 text-sm border-t border-white/[0.06] pt-4">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-white/30" />
                  <div>
                    <p className="text-xs text-white/35">Email Address</p>
                    <p className="text-white/80">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-white/30" />
                  <div>
                    <p className="text-xs text-white/35">Phone Number</p>
                    <p className="text-white/80">{selectedUser.phone || "Not provided"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Briefcase size={16} className="text-white/30" />
                  <div>
                    <p className="text-xs text-white/35">Department & Title</p>
                    <p className="text-white/80">
                      {selectedUser.department ? `${selectedUser.department} · ` : ""}
                      {selectedUser.title || "No designation"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-white/30" />
                  <div>
                    <p className="text-xs text-white/35">Account Status</p>
                    <p className="text-white/80 capitalize">{selectedUser.status}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-white/30" />
                  <div>
                    <p className="text-xs text-white/35">Created Date</p>
                    <p className="text-white/80">
                      {new Date(selectedUser.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn-gradient px-5 py-2 rounded-lg text-sm font-600 text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
