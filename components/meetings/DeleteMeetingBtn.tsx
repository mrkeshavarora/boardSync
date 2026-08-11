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
      className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-600 text-sm text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-60"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Trash2 size={16} />
      )}
      {loading ? "Deleting..." : "Delete Meeting"}
    </button>
  );
}
