"use client";

import { useState } from "react";
import { Check, Clock, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RSVPActionProps {
  meetingId: string;
  initialStatus?: "Pending" | "Accepted" | "Tentative" | "Declined";
}

export default function RSVPAction({ meetingId, initialStatus = "Pending" }: RSVPActionProps) {
  const [status, setStatus] = useState<"Pending" | "Accepted" | "Tentative" | "Declined">(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleRSVP = async (newStatus: "Accepted" | "Tentative" | "Declined") => {
    if (loading || status === newStatus) return;
    setLoading(true);
    const prev = status;
    setStatus(newStatus);

    try {
      const res = await fetch(`/api/meetings/${meetingId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        setStatus(prev);
      } else {
        const json = await res.json();
        if (json.status) setStatus(json.status);
      }
    } catch {
      setStatus(prev);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] p-4 bg-white/[0.03] space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-600 text-white/50 uppercase tracking-wider">Your Attendance RSVP</p>
        <span
          className={cn(
            "text-xs font-600 px-2.5 py-0.5 rounded-full border",
            status === "Accepted" && "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
            status === "Tentative" && "bg-amber-500/10 text-amber-300 border-amber-500/20",
            status === "Declined" && "bg-red-500/10 text-red-300 border-red-500/20",
            status === "Pending" && "bg-white/10 text-white/60 border-white/10"
          )}
        >
          {status === "Declined" ? "Cannot Attend" : status === "Accepted" ? "Attending" : status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleRSVP("Accepted")}
          disabled={loading}
          className={cn(
            "py-2 px-3 rounded-xl border text-xs font-600 flex items-center justify-center gap-1.5 transition-all",
            status === "Accepted"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
              : "bg-white/[0.04] text-white/60 border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
          )}
        >
          {loading && status === "Accepted" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Check size={13} />
          )}
          <span>Attending</span>
        </button>

        <button
          onClick={() => handleRSVP("Tentative")}
          disabled={loading}
          className={cn(
            "py-2 px-3 rounded-xl border text-xs font-600 flex items-center justify-center gap-1.5 transition-all",
            status === "Tentative"
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10"
              : "bg-white/[0.04] text-white/60 border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
          )}
        >
          {loading && status === "Tentative" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Clock size={13} />
          )}
          <span>Tentative</span>
        </button>

        <button
          onClick={() => handleRSVP("Declined")}
          disabled={loading}
          className={cn(
            "py-2 px-3 rounded-xl border text-xs font-600 flex items-center justify-center gap-1.5 transition-all",
            status === "Declined"
              ? "bg-red-500/20 text-red-300 border-red-500/40 shadow-lg shadow-red-500/10"
              : "bg-white/[0.04] text-white/60 border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
          )}
        >
          {loading && status === "Declined" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <X size={13} />
          )}
          <span>Cannot Attend</span>
        </button>
      </div>
    </div>
  );
}
