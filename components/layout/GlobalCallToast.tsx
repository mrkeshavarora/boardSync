"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { PhoneCall, PhoneOff, Check, Video, Phone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { getInitials } from "@/lib/utils";

interface IncomingCall {
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  callerRole: string;
  type: "voice" | "video";
  roomName: string;
  messageId: string;
  isGroup?: boolean;
  groupId?: string;
  groupName?: string;
}

// How often to poll (ms)
const POLL_INTERVAL = 2000;

function playRingtone() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function GlobalCallToast() {
  const { data: session } = useSession();
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRungRef = useRef<string | null>(null);

  useEffect(() => {
    // Initialize dismissed ID from session storage
    const stored = sessionStorage.getItem("dismissedCallId");
    if (stored) setDismissedId(stored);
  }, []);

  const poll = async () => {
    try {
      const res = await fetch("/api/chat/incoming-call");
      if (!res.ok) return;
      const data = await res.json();
      const call: IncomingCall | null = data.call;

      if (call && call.messageId !== dismissedId) {
        setIncomingCall(call);
        setIsVisible(true);
        if (hasRungRef.current !== call.messageId) {
          hasRungRef.current = call.messageId;
          playRingtone();
        }
      } else if (!call) {
        // Call gone (accepted / timed out / ended) — hide
        setIsVisible(false);
        setTimeout(() => setIncomingCall(null), 300);
      }
    } catch {
      // Silently ignore poll errors
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, dismissedId]);

  const dismiss = () => {
    if (!incomingCall) return;
    setDismissedId(incomingCall.messageId);
    sessionStorage.setItem("dismissedCallId", incomingCall.messageId);
    
    // Send decline message ONLY if it's a 1-on-1 call.
    // For group calls, declining just dismisses the toast locally.
    if (!incomingCall.isGroup) {
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: incomingCall.callerId,
          message: `[CALL_DECLINED]:${incomingCall.roomName}`,
        }),
      }).catch(() => {});
    }
    
    setIsVisible(false);
    setTimeout(() => setIncomingCall(null), 300);
  };

  const accept = () => {
    if (!incomingCall) return;
    setDismissedId(incomingCall.messageId);
    sessionStorage.setItem("dismissedCallId", incomingCall.messageId);
    setIsVisible(false);
    setTimeout(() => setIncomingCall(null), 200);
    // Navigate to chat with this person or group
    if (incomingCall.isGroup) {
      router.push(`/chat?acceptGroup=${incomingCall.groupId}&type=${incomingCall.type}`);
    } else {
      router.push(`/chat?accept=${incomingCall.callerId}&type=${incomingCall.type}&room=${incomingCall.roomName}&callerName=${encodeURIComponent(incomingCall.callerName)}`);
    }
  };

  if (!incomingCall) return null;

  return (
    <div
      className={`fixed top-3 left-3 right-3 sm:left-auto sm:right-5 sm:w-80 w-auto z-[9999] transition-all duration-300 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
    >
      <div
        className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,27,75,0.97) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)",
        }}
      >
        {/* Animated shimmer bar at top */}
        <div
          className="h-1 w-full"
          style={{
            background: "linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #6366f1 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s linear infinite",
          }}
        />

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              {/* Pulsing call icon */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
                <div className="relative w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  {incomingCall.type === "video" ? <Video size={14} /> : <Phone size={14} />}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-600 text-indigo-400 uppercase tracking-wider">
                  Incoming {incomingCall.isGroup ? "Group " : ""}{incomingCall.type} call
                </p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all"
            >
              <X size={12} />
            </button>
          </div>

          {/* Caller info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-sm font-700 text-white overflow-hidden">
                {incomingCall.callerAvatar ? (
                  <img
                    src={incomingCall.callerAvatar}
                    alt={incomingCall.callerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(incomingCall.callerName)
                )}
              </div>
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0f1629]" />
            </div>
            <div>
              <p className="text-base font-700 text-white leading-tight">
                {incomingCall.isGroup ? incomingCall.groupName : incomingCall.callerName}
              </p>
              <p className="text-xs text-white/40 uppercase mt-0.5 flex items-center gap-1">
                {incomingCall.isGroup ? (
                  <>Started by <span className="text-white/70 font-500">{incomingCall.callerName}</span></>
                ) : (
                  incomingCall.callerRole?.replace(/_/g, " ")
                )}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={dismiss}
              className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-700 text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all"
            >
              <PhoneOff size={14} /> Decline
            </button>
            <button
              onClick={accept}
              className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-700 text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Check size={14} /> Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
