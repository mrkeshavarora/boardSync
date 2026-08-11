"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function StartMeetingButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function startMeeting() {
    try {
      setLoading(true);
      // Create a meeting id locally and navigate to the meeting with autojoin.
      // The signalling server doesn't need a pre-created meeting; the room name will be the id.
      const id = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2, 10);
      router.push(`/meetings/${id}?autojoin=1`);
    } catch (err) {
      console.error(err);
      alert("Could not start meeting.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={startMeeting}
      disabled={loading}
      className={className ?? "btn-gradient flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600"}
    >
      <Plus size={15} /> {loading ? "Starting..." : "Start Meeting"}
    </button>
  );
}
