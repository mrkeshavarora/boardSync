"use client";

import React, { useEffect, useState, useRef } from "react";
import { MessageSquare, Volume2, Mic, X, Sparkles, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TranscriptItem {
  meetingId: string;
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: string;
  startTime?: string;
  endTime?: string;
  isFinal: boolean;
}

interface LiveTranscriptPanelProps {
  socket: any;
  meetingId: string;
  currentUser: { id: string; name: string };
  isListening: boolean;
  statusText: string; // "Live transcription" or "Reconnecting transcription..."
  statusColorClass: string; // "text-emerald-400" or "text-amber-400"
}

export default function LiveTranscriptPanel({
  socket,
  meetingId,
  currentUser,
  isListening,
  statusText,
  statusColorClass,
}: LiveTranscriptPanelProps) {
  const [finalTranscripts, setFinalTranscripts] = useState<TranscriptItem[]>([]);
  const [activePartials, setActivePartials] = useState<Record<string, { text: string; timestamp: string; speakerName: string }>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [finalTranscripts, activePartials]);

  // Load existing transcripts from Meeting on mount
  useEffect(() => {
    const fetchExistingTranscript = async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.meeting?.transcript) {
            const loaded = json.meeting.transcript.map((t: any) => ({
              meetingId,
              speakerId: t.speakerId || "",
              speakerName: t.speakerName,
              text: t.text,
              timestamp: t.timestamp,
              isFinal: true,
            }));
            setFinalTranscripts(loaded);
          }
        }
      } catch (err) {
        console.error("Failed to load initial transcript:", err);
      }
    };
    fetchExistingTranscript();
  }, [meetingId]);

  // Listen for socket and local window events
  useEffect(() => {
    // Handle partial transcript segment
    const handlePartial = (data: TranscriptItem) => {
      if (data.meetingId !== meetingId) return;
      setActivePartials((prev) => ({
        ...prev,
        [data.speakerId]: {
          text: data.text,
          timestamp: data.timestamp,
          speakerName: data.speakerName,
        },
      }));
    };

    // Handle final transcript segment
    const handleFinal = (data: TranscriptItem) => {
      if (!data || data.meetingId !== meetingId) return;
      
      // Remove from active partials
      setActivePartials((prev) => {
        const copy = { ...prev };
        delete copy[data.speakerId];
        return copy;
      });

      // Add to final transcripts list with strict deduplication
      setFinalTranscripts((prev) => {
        const isDuplicate = prev.some(
          (t) =>
            t.speakerId === data.speakerId &&
            t.text.trim() === data.text.trim() &&
            Math.abs(new Date(t.timestamp).getTime() - new Date(data.timestamp).getTime()) < 2500
        );
        if (isDuplicate) return prev;
        return [...prev, data];
      });
    };

    // Handle local window custom event (fallback when socket is offline or local STT active)
    const handleLocal = (e: any) => {
      const data = e.detail;
      if (!data) return;
      if (data.isFinal) {
        handleFinal(data);
      } else {
        handlePartial(data);
      }
    };

    window.addEventListener("local-transcript", handleLocal);

    if (socket) {
      socket.on("transcript:partial", handlePartial);
      socket.on("transcript:final", handleFinal);
    }

    return () => {
      window.removeEventListener("local-transcript", handleLocal);
      if (socket) {
        socket.off("transcript:partial", handlePartial);
        socket.off("transcript:final", handleFinal);
      }
    };
  }, [socket, meetingId]);

  // Helper to format timestamp
  const getDisplayTime = (isoString?: string) => {
    if (!isoString) return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-80 sm:w-96 border-r border-white/[0.06] flex flex-col shrink-0 h-full relative" style={{ background: "#080d1a" }}>
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between bg-black/40">
        <div className="flex flex-col">
          <h3 className="text-sm font-700 text-white flex items-center gap-1.5">
            <Sparkles size={14} className="text-indigo-400 animate-pulse" />
            Live Transcript
          </h3>
          <span className={cn("text-[10px] font-medium mt-0.5 flex items-center gap-1.5", statusColorClass)}>
            <span className={cn("w-1.5 h-1.5 rounded-full bg-current", isListening && "animate-ping")} />
            {statusText}
          </span>
        </div>
      </div>

      {/* Transcript List Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-gradient-to-b from-[#080d1a] to-[#040811]"
      >
        {statusText.includes("not-allowed") && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs space-y-1">
            <p className="font-600">Microphone Permission Blocked</p>
            <p className="text-[11px] text-red-300/80">Click the lock/camera icon in your address bar and set Microphone to <strong>Allow</strong>, then refresh.</p>
          </div>
        )}

        {statusText.includes("network") && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
            <p className="font-600">Speech Network Blocked (Brave / Privacy Shield)</p>
            <p className="text-[11px] text-amber-300/80">If using Brave browser, open <code>brave://settings/privacy</code> and turn on <em>Use Google Services for Speech Recognition</em>.</p>
          </div>
        )}

        {statusText.includes("Not Supported") && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
            <p className="font-600">Browser Not Supported</p>
            <p className="text-[11px] text-amber-300/80">Web Speech recognition requires Google Chrome, Microsoft Edge, or Safari.</p>
          </div>
        )}
        {finalTranscripts.length === 0 && Object.keys(activePartials).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/30 space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Volume2 size={20} className="animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60">No speech transcribed yet</p>
              <p className="text-[10px] text-white/20 mt-1">Start speaking into your mic. Your transcript will appear instantly on the left.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Finalized segments */}
            {finalTranscripts.map((t, idx) => (
              <div key={idx} className="flex gap-3 group animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                  <User size={14} />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-700 text-white truncate">
                      {t.speakerName} {t.speakerId === currentUser.id ? "(You)" : ""}
                    </span>
                    <span className="text-[9px] text-white/30 shrink-0 font-medium">
                      {getDisplayTime(t.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed font-400 whitespace-pre-wrap break-words">
                    {t.text}
                  </p>
                </div>
              </div>
            ))}

            {/* Active partial segments (interim - real-time word-by-word) */}
            {Object.entries(activePartials).map(([speakerId, partial]) => (
              <div key={speakerId} className="flex gap-3 group">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 shadow-sm shadow-emerald-500/20">
                  <Mic size={14} className="animate-pulse" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-700 text-emerald-400 truncate flex items-center gap-1.5">
                      {partial.speakerName} {speakerId === currentUser.id ? "(You)" : ""}
                    </span>
                    <span className="text-[9px] text-emerald-400/80 shrink-0 font-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 leading-relaxed font-500 break-words bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-xl">
                    {partial.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3 border-t border-white/[0.06] bg-black/40 text-[10px] text-white/30 text-center">
        Powered by Web Speech Engine & OpenAI AI Minutes
      </div>
    </div>
  );
}
