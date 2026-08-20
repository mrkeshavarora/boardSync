"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface DeleteMinutesButtonProps {
  minutesId: string;
  meetingTitle?: string;
  canDelete: boolean;
}

export default function DeleteMinutesButton({
  minutesId,
  meetingTitle = "this minutes record",
  canDelete,
}: DeleteMinutesButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!canDelete) return null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete the minutes for "${meetingTitle}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/minutes/${minutesId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete minutes");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while deleting minutes.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all inline-flex items-center justify-center disabled:opacity-50 shadow-xs cursor-pointer"
      title="Delete Minutes"
    >
      {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}
