"use client";

import { useState } from "react";
import { Mail, Check, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SendInviteBtnProps {
  meetingId: string;
  initialSentCount?: number;
  totalParticipants?: number;
  hasBeenSentBefore?: boolean;
}

export default function SendInviteBtn({
  meetingId,
  initialSentCount = 0,
  totalParticipants = 0,
  hasBeenSentBefore = false,
}: SendInviteBtnProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [isSent, setIsSent] = useState<boolean>(hasBeenSentBefore || initialSentCount > 0);
  const [message, setMessage] = useState<string>("");
  const [sentCount, setSentCount] = useState<number>(initialSentCount);

  const handleSendInvite = async () => {
    if (status === "sending") return;

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch(`/api/meetings/${meetingId}/send-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      setStatus("success");
      setIsSent(true);
      setSentCount(data.sentCount || totalParticipants);
      setMessage(data.message || "Meeting invite sent successfully");

      router.refresh();
    } catch (err: any) {
      console.error("Error sending invite:", err);
      setStatus("error");
      setMessage(err.message || "Failed to send invite");
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* Main Action Button */}
      {isSent ? (
        <div className="space-y-2">
          <div className="w-full py-2.5 px-4 rounded-xl flex items-center justify-between gap-2 text-xs font-600 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
            <span className="flex items-center gap-2">
              <Check size={16} className="text-emerald-400" />
              Invite Sent ({sentCount}/{totalParticipants} Members)
            </span>
            <span className="badge bg-emerald-500/20 text-emerald-300 border-0 text-[10px]">
              Sent
            </span>
          </div>

          <button
            onClick={handleSendInvite}
            disabled={status === "sending"}
            className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-500 text-xs text-white/70 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all disabled:opacity-50"
          >
            {status === "sending" ? (
              <>
                <Loader2 size={14} className="animate-spin text-indigo-400" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Resend Invite
              </>
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={handleSendInvite}
          disabled={status === "sending"}
          className={cn(
            "w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 font-600 text-sm text-white shadow-lg transition-all",
            "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/25",
            status === "sending" && "opacity-80 cursor-not-allowed"
          )}
        >
          {status === "sending" ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Mail size={18} />
              <span>Send Meeting Invite</span>
            </>
          )}
        </button>
      )}

      {/* Status Feedback Messages */}
      {status === "success" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 animate-fade-in">
          <Check size={14} className="shrink-0 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-300 animate-fade-in">
          <AlertCircle size={14} className="shrink-0 text-red-400" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
