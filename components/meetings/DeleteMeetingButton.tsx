"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface DeleteMeetingButtonProps {
  meetingId: string;
  meetingTitle: string;
  canDelete: boolean;
}

export default function DeleteMeetingButton({
  meetingId,
  meetingTitle,
  canDelete,
}: DeleteMeetingButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!canDelete) return null;

  const handleDelete = async (e: React.MouseEvent) => {
    // Prevent navigating to meeting room when clicking delete button
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete the meeting "${meetingTitle}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete meeting");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-colors inline-flex items-center justify-center disabled:opacity-50"
      title="Delete Meeting"
    >
      {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
    </button>
  );
}
