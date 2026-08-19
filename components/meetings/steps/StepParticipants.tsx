"use client";

import { Search, UserPlus, X, Send, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { getInitials } from "@/lib/utils";

type SearchUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: "Accepted" | "Pending" | "Rejected";
  direction?: "incoming" | "outgoing";
  connectionStatus?: "connected" | "pending" | "incoming" | "none";
};

export default function StepParticipants({ data, updateData }: { data: any; updateData: (d: any) => void }) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [connections, setConnections] = useState<SearchUser[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = async () => {
    try {
      const res = await fetch("/api/connections", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setConnections(json.connections ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchConnections();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoadingSearch(true);
      setError(null);

      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(searchTerm)}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError(json.error || "Unable to load users.");
          setSearchResults([]);
          return;
        }

        const json = await res.json();
        const results: SearchUser[] = (json.users ?? [])
          .filter((user: any) => user._id !== session?.user?.id)
          .map((user: any) => ({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            connectionStatus: "none",
          }));

        setSearchResults(results);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error(err);
          setError("Unable to load users.");
          setSearchResults([]);
        }
      } finally {
        setLoadingSearch(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchTerm, session?.user?.id]);

  const acceptedConnections = useMemo(
    () => connections.filter((connection) => connection.status === "Accepted"),
    [connections]
  );

  const selectedUserIds = useMemo(
    () => data.participants.map((p: any) => p.userId),
    [data.participants]
  );

  const handleAddParticipant = (user: SearchUser) => {
    if (!selectedUserIds.includes(user.id)) {
      updateData({
        participants: [
          ...data.participants,
          { userId: user.id, name: user.name, email: user.email, role: user.role || "Attendee" },
        ],
      });
    }
  };

  const handleRemoveParticipant = (userId: string) => {
    updateData({
      participants: data.participants.filter((p: any) => p.userId !== userId),
    });
  };

  const handleSendConnectionRequest = async (targetUserId: string) => {
    setSendingRequestId(targetUserId);
    setError(null);

    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409 && json.error === "You are already connected.") {
          const targetUser = displayUsers.find(u => u.id === targetUserId);
          if (targetUser) handleAddParticipant(targetUser);
          await fetchConnections();
          return;
        }
        setError(json.error || "Unable to send connection request.");
        return;
      }

      await fetchConnections();
      setSearchResults((current) =>
        current.map((result) =>
          result.id === targetUserId
            ? { ...result, connectionStatus: json.connection?.status === "Accepted" ? "connected" : "pending" }
            : result
        )
      );
    } catch (err) {
      console.error(err);
      setError("Unable to send connection request.");
    } finally {
      setSendingRequestId(null);
    }
  };

  const displayUsers = searchTerm.trim() ? searchResults.map(user => {
    const conn = connections.find(c => c.id === user.id);
    let connectionStatus: SearchUser["connectionStatus"] = "none";
    if (conn) {
      if (conn.status === "Accepted") connectionStatus = "connected";
      else if (conn.status === "Pending") connectionStatus = conn.direction === "outgoing" ? "pending" : "incoming";
    }
    return { ...user, connectionStatus };
  }) : acceptedConnections;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-600 text-white">Participants</h2>
        <p className="text-sm text-white/40">Add attendees from your accepted connections or search by name to connect with other users.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users or connections..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/60 transition-all"
            />
          </div>

          <div className="border border-white/[0.06] rounded-xl bg-white/[0.02] max-h-[250px] overflow-y-auto">
            {error && (
              <div className="px-4 py-3 text-sm text-red-300 bg-red-500/10">{error}</div>
            )}
            {displayUsers.length === 0 ? (
              <div className="p-6 text-center border-b border-white/[0.06] last:border-0">
                <p className="text-sm text-white/30">
                  {searchTerm.trim()
                    ? loadingSearch
                      ? "Searching users…"
                      : "No users match that name."
                    : "No connected users yet. Search to connect with people in your organization."}
                </p>
              </div>
            ) : (
              displayUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                const canAdd = user.connectionStatus === "connected";
                const isPending = user.connectionStatus === "pending" || user.connectionStatus === "incoming";
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-600 text-white">
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <p className="text-sm font-500 text-white">{user.name}</p>
                        <p className="text-xs text-white/40">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {searchTerm.trim() && user.connectionStatus !== "none" && (
                        <span className="text-[11px] rounded-full px-2 py-1 bg-white/[0.08] text-white/70">
                          {user.connectionStatus === "connected" ? "Connected" : user.connectionStatus === "incoming" ? "Request Received" : "Request Sent"}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          if (canAdd) handleAddParticipant(user);
                          else handleSendConnectionRequest(user.id);
                        }}
                        disabled={isSelected || (!canAdd && isPending) || sendingRequestId === user.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/50 transition-colors"
                        title={isSelected ? "Already selected" : canAdd ? "Add to participants" : "Send connection request"}
                      >
                        {canAdd ? <UserPlus size={14} /> : isPending ? <UserCheck size={14} /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-500 text-white/70">Selected ({data.participants.length})</h3>
          {data.participants.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-white/[0.1] rounded-xl">
              <p className="text-sm text-white/30">No participants added yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {data.participants.map((p: any) => (
                <div key={p.userId} className="flex items-center justify-between p-3 border border-white/[0.06] rounded-xl bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-600 text-indigo-300">
                      {getInitials(p.name)}
                    </div>
                    <div>
                      <p className="text-sm font-500 text-white">{p.name}</p>
                      <p className="text-xs text-white/40">{p.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveParticipant(p.userId)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
