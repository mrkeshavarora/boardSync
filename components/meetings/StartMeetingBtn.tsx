"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface StartMeetingBtnProps {
  meetingId: string;
  currentStatus: string;
}

export default function StartMeetingBtn({ meetingId, currentStatus }: StartMeetingBtnProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (currentStatus === "In Progress") {
    return (
      <span className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-600 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Meeting In Progress
      </span>
    );
  }

  if (currentStatus === "Completed" || currentStatus === "Cancelled" || currentStatus === "Archived") {
    return null;
  }

  const handleStart = async () => {
    if (!confirm(`Are you sure you want to start this meeting? All participants will be notified.`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/start`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to start meeting.");
        return;
      }
      // Navigate directly to the video room
      router.push(`/meetings/${meetingId}/room`);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      id="start-meeting-btn"
      onClick={handleStart}
      disabled={loading}
      className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-600 text-xs text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", boxShadow: "0 4px 14px rgba(16,185,129,0.4)" }}
    >
      {loading ? (
        <><Loader2 size={13} className="animate-spin" /> Starting…</>
      ) : (
        <><Play size={13} className="fill-white" /> Start Meeting</>
      )}
    </button>
  );
}
