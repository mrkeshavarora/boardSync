"use client";

import React, { useEffect, useState, useRef } from "react";
import { MessageSquare, Volume2, Mic, X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CaptionMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSelf?: boolean;
}

interface LiveCaptionsPanelProps {
  socket: any;
  meetingId: string;
  senderName: string;
  isMuted?: boolean;
}

export default function LiveCaptionsPanel({
  socket,
  meetingId,
  senderName,
  isMuted = false,
}: LiveCaptionsPanelProps) {
  const [captions, setCaptions] = useState<CaptionMessage[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll to bottom when new captions arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [captions]);

  // 1. Socket listener for incoming captions from other participants
  useEffect(() => {
    if (!socket) return;

    const handleCaption = (data: { senderName: string; text: string; timestamp: string }) => {
      if (!data.text || !data.text.trim()) return;
      const newMsg: CaptionMessage = {
        id: Math.random().toString(36).substring(2, 9),
        senderName: data.senderName || "Participant",
        text: data.text,
        timestamp: data.timestamp
          ? new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        isSelf: false,
      };
      setCaptions((prev) => [...prev.slice(-40), newMsg]);
    };

    socket.on("speech-caption", handleCaption);

    return () => {
      socket.off("speech-caption", handleCaption);
    };
  }, [socket]);

  // 2. Web Speech API Recognition for local user
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        const trimmed = finalTranscript.trim();
        if (trimmed.length > 0) {
          const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const newMsg: CaptionMessage = {
            id: Math.random().toString(36).substring(2, 9),
            senderName: senderName || "You",
            text: trimmed,
            timestamp,
            isSelf: true,
          };

          setCaptions((prev) => [...prev.slice(-40), newMsg]);

          // Emit to socket room
          if (socket) {
            socket.emit("speech-caption", {
              meetingId,
              senderName: senderName || "Participant",
              text: trimmed,
            });
          }
        }
      };

      recognition.onerror = (err: any) => {
        console.warn("Speech recognition error:", err.error);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart if continuous listening is desired and mic is not muted
        if (recognitionRef.current && !isMuted) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;

      if (!isMuted) {
        try {
          recognition.start();
        } catch {}
      }
    } catch (e) {
      console.warn("Could not start SpeechRecognition:", e);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [meetingId, senderName, socket]);

  // Handle Mute toggle
  useEffect(() => {
    if (!recognitionRef.current) return;
    if (isMuted) {
      try {
        recognitionRef.current.stop();
      } catch {}
    } else {
      try {
        recognitionRef.current.start();
      } catch {}
    }
  }, [isMuted]);

  return (
    <div
      className={cn(
        "absolute left-4 top-16 bottom-24 z-30 transition-all duration-300 flex items-start pointer-events-auto",
        isOpen ? "w-80 sm:w-96" : "w-12"
      )}
    >
      {/* Panel Box */}
      {isOpen ? (
        <div className="w-full h-full bg-slate-950/85 backdrop-blur-xl border border-indigo-500/20 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-950/60 to-slate-900/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles size={14} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-700 text-white flex items-center gap-1.5">
                  Live Subtitles & Captions
                  {isListening && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  )}
                </h3>
                <p className="text-[10px] text-white/50">Real-time speech transcription</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              title="Minimize panel"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Captions Body Feed */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
          >
            {!isSupported && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                Speech recognition is not natively supported in this browser. Install Chrome or Edge for automatic speech recognition.
              </div>
            )}

            {captions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/30 space-y-2">
                <Volume2 size={24} className="animate-bounce text-indigo-400/50" />
                <p className="text-xs">Listening for speakers...</p>
                <p className="text-[10px] text-white/20">When someone speaks, their words will appear live here on the left panel.</p>
              </div>
            ) : (
              captions.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "p-3 rounded-xl border transition-all text-xs space-y-1 animate-fade-in",
                    c.isSelf
                      ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-100"
                      : "bg-white/[0.04] border-white/[0.08] text-white/90"
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] font-600">
                    <span className={c.isSelf ? "text-indigo-300" : "text-emerald-400"}>
                      {c.senderName} {c.isSelf ? "(You)" : ""}
                    </span>
                    <span className="text-white/30 font-400">{c.timestamp}</span>
                  </div>
                  <p className="text-xs leading-relaxed font-400">{c.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Panel Footer */}
          <div className="px-4 py-2 border-t border-white/10 bg-black/40 text-[10px] text-white/40 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Mic size={10} className={isListening ? "text-emerald-400" : "text-red-400"} />
              {isMuted ? "Mic Muted" : isListening ? "Listening Live" : "Mic Idle"}
            </span>
            <span>{captions.length} lines transcribed</span>
          </div>
        </div>
      ) : (
        /* Minimized Toggle Button on Left */
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-950/90 border border-indigo-500/40 hover:bg-indigo-900 p-3 rounded-xl text-indigo-300 shadow-2xl flex items-center gap-2 backdrop-blur-md transition-all hover:scale-105"
          title="Open Live Subtitles"
        >
          <Sparkles size={18} className="animate-pulse" />
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
