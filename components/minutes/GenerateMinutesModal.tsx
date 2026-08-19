"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Mic, MicOff, Square, Upload, Loader2, CheckCircle2, XCircle,
  AlertTriangle, FileAudio, ChevronRight, X, Sparkles,
} from "lucide-react";

interface GenerateMinutesModalProps {
  meetingId: string;
  meetingTitle: string;
  onClose: () => void;
}

type Step = "idle" | "recording" | "uploading" | "transcribing" | "generating" | "done" | "error";

const STEPS = [
  { id: "uploading",    label: "Uploading audio"     },
  { id: "transcribing", label: "Transcribing speech" },
  { id: "generating",  label: "Generating MoM draft" },
  { id: "done",        label: "Draft ready!"         },
];

export default function GenerateMinutesModal({
  meetingId,
  meetingTitle,
  onClose,
}: GenerateMinutesModalProps) {
  const router = useRouter();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [step, setStep] = useState<Step>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [minutesId, setMinutesId] = useState("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [mode, setMode] = useState<"ai" | "record" | "upload" | "transcript">("ai");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // --- Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setStep("idle");
      };
      mr.start(1000);
      setStep("recording");
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setErrorMsg("Microphone access denied. Please allow microphone permission.");
      setStep("error");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // --- Submit ---
  const handleGenerate = async () => {
    setErrorMsg("");

    if (mode === "ai") {
      setStep("generating");
      try {
        const res = await fetch(`/api/meetings/${meetingId}/generate-ai-minutes`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "AI generation failed. Ensure live transcript or recording is available.");
          setStep("error");
          return;
        }
        setStep("done");
        setMinutesId(data.meeting?._id || meetingId);
      } catch {
        setErrorMsg("Network error during AI minutes generation.");
        setStep("error");
      }
      return;
    }

    const formData = new FormData();

    if (mode === "record" && recordedBlob) {
      formData.append("audio", recordedBlob, "meeting_recording.webm");
    } else if (mode === "upload" && uploadedFile) {
      formData.append("audio", uploadedFile, uploadedFile.name);
    } else if (mode === "transcript" && manualTranscript.trim().length > 20) {
      formData.append("transcript", manualTranscript.trim());
    } else {
      setErrorMsg("Please record, upload a file, or paste a transcript first.");
      return;
    }

    setStep("uploading");
    await new Promise((r) => setTimeout(r, 500));
    setStep("transcribing");

    try {
      const res = await fetch(`/api/meetings/${meetingId}/generate-minutes`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Generation failed. Please try again.");
        setStep("error");
        return;
      }

      setStep("generating");
      await new Promise((r) => setTimeout(r, 600));
      setStep("done");
      setMinutesId(data.minutesId);
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStep("error");
    }
  };

  const getErrorDetails = (msg: string) => {
    const isKeyMissing = msg.toLowerCase().includes("key missing") || msg.toLowerCase().includes("not set");
    const isQuota = msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("credits") || msg.includes("429");
    const isNoTranscript = msg.toLowerCase().includes("no live transcript") || msg.toLowerCase().includes("no transcript found");
    const isNotCompleted = msg.toLowerCase().includes("not completed");

    if (isKeyMissing) {
      return {
        badge: "🔑 OpenAI Key Missing",
        badgeClass: "bg-red-500/20 text-red-300 border-red-500/30",
        title: "API Key Configuration Required",
        advice: "Please add your OPENAI_API_KEY to your project's .env.local file to enable AI generation.",
      };
    }
    if (isQuota) {
      return {
        badge: "💳 OpenAI Quota Exceeded",
        badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        title: "Account Credits Depleted",
        advice: "Your OpenAI billing limit has been reached. Please add billing credits at platform.openai.com.",
      };
    }
    if (isNoTranscript) {
      return {
        badge: "📝 No Live Captions Found",
        badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        title: "No Live Meeting Captions Captured",
        advice: "No speech captions were recorded during the live call. Try recording audio, uploading an audio file, or pasting transcript text manually.",
      };
    }
    if (isNotCompleted) {
      return {
        badge: "⏳ Meeting Incomplete",
        badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        title: "Meeting Must Be Completed First",
        advice: "To generate minutes automatically, complete the meeting call or update its status to 'Completed'.",
      };
    }
    return {
      badge: "⚠️ Error",
      badgeClass: "bg-red-500/20 text-red-300 border-red-500/30",
      title: "Generation Failed",
      advice: "Please review the error message above or try an alternative mode (Audio Upload or Manual Text).",
    };
  };

  const activeStepIndex = STEPS.findIndex((s) => s.id === step);
  const isProcessing = ["uploading", "transcribing", "generating"].includes(step);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      {/* Scrollable inner wrapper for very small screens */}
      <div className="w-full flex items-center justify-center p-4 overflow-y-auto" style={{ maxHeight: "100dvh" }}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.14] shadow-2xl shadow-black/80 animate-fade-in"
        style={{ background: "#0d1527" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(124,58,237,0.2))", border: "1px solid rgba(99,102,241,0.35)" }}>
              <Sparkles size={16} className="text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-600 text-white text-sm leading-tight truncate">Generate Meeting Minutes</h2>
              <p className="text-[11px] text-white/40 truncate mt-0.5">{meetingTitle}</p>
            </div>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Governance notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              <strong className="font-600 text-amber-300">Governance:</strong> AI-generated minutes are a draft only. They must be reviewed, edited if needed, and formally approved before becoming official records.
            </p>
          </div>

          {/* Main content body when not processing */}
          {(step === "idle" || step === "recording") && !isProcessing && (
            <>
              {/* AI Live Transcript Mode */}
              <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-700 text-white">Generate from Live Meeting Transcript</h4>
                  <p className="text-xs text-white/50 mt-1 max-w-sm">
                    Uses real-time live captions and transcript segments captured during this meeting to produce an AI-summarized Minutes draft.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="flex flex-col gap-2 p-3.5 rounded-xl text-left" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${getErrorDetails(errorMsg).badgeClass}`}>
                      {getErrorDetails(errorMsg).badge}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-600 text-red-300">{getErrorDetails(errorMsg).title}</p>
                      <p className="text-[11px] leading-relaxed text-red-200/80">{errorMsg}</p>
                      <p className="text-[10px] leading-relaxed text-amber-300/90 pt-0.5 font-500">
                        💡 <strong>Next Step:</strong> {getErrorDetails(errorMsg).advice}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerate}
                className="w-full py-3 rounded-xl btn-gradient font-600 text-sm flex items-center justify-center gap-2"
              >
                <Sparkles size={15} /> Generate AI Draft Minutes
              </button>
            </>
          )}

          {/* Processing state */}
          {isProcessing && (
            <div className="py-4 space-y-3">
              {STEPS.filter((s) => s.id !== "done").map((s, i) => {
                const isDone = activeStepIndex > i;
                const isActive = activeStepIndex === i;
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl transition-all" style={{ background: isActive ? "rgba(99,102,241,0.08)" : "transparent", border: isActive ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent" }}>
                    <div className="w-6 h-6 flex items-center justify-center">
                      {isDone ? <CheckCircle2 size={18} className="text-emerald-400" /> : isActive ? <Loader2 size={18} className="text-indigo-400 animate-spin" /> : <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "var(--border-default)" }} />}
                    </div>
                    <span className={`text-sm font-500 ${isActive ? "text-white" : isDone ? "text-emerald-400" : "text-white/30"}`}>{s.label}</span>
                  </div>
                );
              })}
              <p className="text-xs text-center pt-2" style={{ color: "var(--text-muted)" }}>This may take up to 60 seconds…</p>
            </div>
          )}

          {/* Error state */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 p-4 rounded-xl text-left" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full border ${getErrorDetails(errorMsg).badgeClass}`}>
                    {getErrorDetails(errorMsg).badge}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <XCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-700 text-red-300">{getErrorDetails(errorMsg).title}</p>
                    <p className="text-xs text-red-200/80 leading-relaxed">{errorMsg}</p>
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed mt-2">
                      💡 <strong>Next Step:</strong> {getErrorDetails(errorMsg).advice}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setStep("idle"); setErrorMsg(""); }}
                className="w-full py-2.5 rounded-xl text-sm font-600 text-white/70 hover:text-white border transition-colors"
                style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }}
              >
                Try Again / Select Another Mode
              </button>
            </div>
          )}

          {/* Done state */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-700 text-white">Draft Ready!</h3>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Your AI-generated draft is waiting for review. Please check all content before approving.</p>
              </div>
              <button onClick={() => router.push(`/minutes/${minutesId}`)} className="flex items-center gap-2 px-6 py-3 rounded-xl btn-gradient font-600 text-sm">
                Review & Edit Draft <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
