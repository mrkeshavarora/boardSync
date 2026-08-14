"use client";

import { useState, useEffect } from "react";
import { UserPlus, X, Search, Check, Users, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { getInitials } from "@/lib/utils";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AddParticipantModalProps {
  meetingId: string;
  existingParticipantUserIds: string[];
  onAdded?: () => void;
}

const PARTICIPANT_ROLES = [
  "Attendee",
  "Board Member",
  "Presenter",
  "Observer",
  "Board Secretary",
];

export default function AddParticipantModal({
  meetingId,
  existingParticipantUserIds,
  onAdded,
}: AddParticipantModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("Attendee");

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setError("");
    try {
      const res = await fetch("/api/users?limit=100");
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        setError(data.error || "Failed to load users");
      }
    } catch (err: any) {
      setError("Failed to fetch user directory");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpen = () => {
    setSelectedUserIds([]);
    setSearch("");
    setError("");
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!submitting) setIsOpen(false);
  };

  const toggleUserSelection = (userId: string) => {
    if (existingParticipantUserIds.includes(userId)) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      setError("Please select at least one user to add.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = selectedUserIds.map((uid) => ({
        userId: uid,
        role: selectedRole,
      }));

      const res = await fetch(`/api/meetings/${meetingId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add participants");
      }

      setIsOpen(false);
      if (onAdded) onAdded();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to add participants");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
  });

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-600 flex items-center gap-1.5 transition-all shadow-sm"
      >
        <UserPlus size={14} />
        Add Participants
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="text-base font-700 text-white">Add Participants</h3>
                  <p className="text-xs text-white/40">Invite members from your organization to this meeting</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={submitting}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-hidden flex flex-col flex-1">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 shrink-0">
                  {error}
                </div>
              )}

              {/* Role Selection */}
              <div className="shrink-0">
                <label className="block text-xs font-500 text-white/70 mb-1.5 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-indigo-400" />
                  Assign Meeting Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
                >
                  {PARTICIPANT_ROLES.map((r) => (
                    <option key={r} value={r} className="bg-neutral-900 text-white">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user by name or email..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-amber-500 transition-all placeholder:text-white/20"
                />
              </div>

              {/* User Selection List */}
              <div className="flex-1 overflow-y-auto min-h-[200px] border border-white/[0.06] rounded-xl p-2 space-y-1 custom-scrollbar">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-12 text-white/40 gap-2 text-sm">
                    <Loader2 size={16} className="animate-spin text-amber-400" />
                    Loading users...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-10 text-white/30 text-sm">
                    No users found matching "{search}"
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isAlreadyAdded = existingParticipantUserIds.includes(user._id);
                    const isSelected = selectedUserIds.includes(user._id);

                    return (
                      <div
                        key={user._id}
                        onClick={() => toggleUserSelection(user._id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                          isAlreadyAdded
                            ? "opacity-50 cursor-not-allowed bg-white/[0.01]"
                            : isSelected
                            ? "bg-amber-500/15 border border-amber-500/30 cursor-pointer"
                            : "hover:bg-white/[0.04] cursor-pointer border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-600 text-white shrink-0">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              getInitials(user.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-600 text-white truncate">{user.name}</p>
                            <p className="text-[11px] text-white/40 truncate">{user.email}</p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {isAlreadyAdded ? (
                            <span className="text-[10px] font-500 px-2 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10">
                              Already Added
                            </span>
                          ) : (
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-amber-500 border-amber-500 text-black"
                                  : "border-white/20 bg-white/5"
                              }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex items-center justify-between shrink-0 border-t border-white/[0.06]">
                <span className="text-xs text-white/40">
                  {selectedUserIds.length} user{selectedUserIds.length !== 1 ? "s" : ""} selected
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl text-xs font-500 text-white/60 hover:text-white hover:bg-white/[0.05] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || selectedUserIds.length === 0}
                    className="btn-gradient px-5 py-2 rounded-xl text-xs font-600 flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        Add Participants
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
