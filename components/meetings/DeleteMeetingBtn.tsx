"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export default function DeleteMeetingBtn({ meetingId }: { meetingId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this meeting? This will permanently remove all agenda items, participants, and associated documents.")) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/meetings");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete meeting");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting the meeting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-600 text-xs transition-all disabled:opacity-60"
      style={{ color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Trash2 size={13} />
      )}
      {loading ? "Deleting..." : "Delete Meeting"}
    </button>
  );
}
