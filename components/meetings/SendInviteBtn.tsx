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

      if (data.sentCount === 0) {
        setStatus("error");
        setMessage(`Failed to send invites. Please check SMTP settings.`);
        return;
      }

      setStatus("success");
      setIsSent(true);
      setSentCount(data.sentCount ?? 0);
      setMessage(data.message || "Meeting invite sent successfully");

      router.refresh();
    } catch (err: any) {
      console.error("Error sending invite:", err);
      setStatus("error");
      setMessage(err.message || "Failed to send invite");
    }
  };

  return (
    <div className="w-full space-y-1.5">
      {/* Main Action Button */}
      {isSent ? (
        <div className="space-y-1.5">
          <div className="w-full px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-[11px] font-600 text-emerald-300" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <span className="flex items-center gap-1.5">
              <Check size={12} className="text-emerald-400" />
              Invite Sent ({sentCount}/{totalParticipants})
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-600" style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}>Sent</span>
          </div>

          <button
            onClick={handleSendInvite}
            disabled={status === "sending"}
            className="w-full px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 font-500 text-[11px] text-white/50 hover:text-white/80 transition-all disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {status === "sending" ? (
              <><Loader2 size={12} className="animate-spin text-indigo-400" /> Sending...</>
            ) : (
              <><RefreshCw size={12} /> Resend Invite</>
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={handleSendInvite}
          disabled={status === "sending"}
          className={cn(
            "w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-600 text-xs text-white transition-all",
            status === "sending" && "opacity-70 cursor-not-allowed"
          )}
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", boxShadow: "0 4px 14px rgba(79,70,229,0.4)" }}
        >
          {status === "sending" ? (
            <><Loader2 size={13} className="animate-spin" /><span>Sending...</span></>
          ) : (
            <><Mail size={13} /><span>Send Meeting Invite</span></>
          )}
        </button>
      )}

      {/* Status Feedback */}
      {status === "success" && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-emerald-300 animate-fade-in" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <Check size={11} className="shrink-0 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-red-300 animate-fade-in" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertCircle size={11} className="shrink-0 text-red-400" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
