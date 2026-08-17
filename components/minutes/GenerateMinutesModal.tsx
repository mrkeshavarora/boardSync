"use client";

import { useEffect, useRef, useState } from "react";
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
        setMinutesId(data.minutes?._id || data.meeting?._id || meetingId);
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

  const activeStepIndex = STEPS.findIndex((s) => s.id === step);
  const isProcessing = ["uploading", "transcribing", "generating"].includes(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-lg rounded-2xl border animate-fade-in"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(124,58,237,0.15))", border: "1px solid rgba(99,102,241,0.3)" }}>
              <Sparkles size={18} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="font-700 text-white text-base">Generate Meeting Minutes</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{meetingTitle}</p>
            </div>
          </div>
          {!isProcessing && <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"><X size={16} /></button>}
        </div>

        <div className="p-6 space-y-5">
          {/* Governance notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed" style={{ color: "rgba(245,158,11,0.9)" }}>
              <strong>Governance:</strong> AI-generated minutes are a draft only. They must be reviewed, edited if needed, and formally approved before becoming official records.
            </p>
          </div>

          {/* Mode tabs */}
          {(step === "idle" || step === "recording") && !isProcessing && (
            <>
              <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                {(["ai", "record", "upload", "transcript"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="flex-1 py-2 px-2.5 rounded-lg text-xs font-600 transition-all truncate"
                    style={
                      mode === m
                        ? { background: "var(--bg-card)", color: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }
                        : { color: "var(--text-muted)" }
                    }
                  >
                    {m === "ai" ? "✨ Live AI" : m === "record" ? "🎙 Record" : m === "upload" ? "📁 Upload" : "📝 Text"}
                  </button>
                ))}
              </div>

              {/* AI Live Transcript Mode */}
              {mode === "ai" && (
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
              )}

              {/* Record mode */}
              {mode === "record" && (
                <div className="flex flex-col items-center gap-4 py-4">
                  {recordedBlob ? (
                    <div className="flex items-center gap-3 w-full p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <FileAudio size={20} className="text-emerald-400" />
                      <div className="flex-1">
                        <p className="text-sm font-600 text-emerald-400">Recording ready</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatTime(recordingSeconds)} recorded</p>
                      </div>
                      <button onClick={() => { setRecordedBlob(null); setRecordingSeconds(0); }} className="text-xs text-white/40 hover:text-white">Re-record</button>
                    </div>
                  ) : step === "recording" ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                          <div className="w-14 h-14 rounded-full bg-red-500/30 flex items-center justify-center">
                            <Mic size={24} className="text-red-400" />
                          </div>
                        </div>
                      </div>
                      <p className="text-2xl font-700 text-white font-mono">{formatTime(recordingSeconds)}</p>
                      <button onClick={stopRecording} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-600 hover:bg-red-500/30 transition-colors">
                        <Square size={14} /> Stop Recording
                      </button>
                    </div>
                  ) : (
                    <button onClick={startRecording} className="flex items-center gap-2 px-6 py-3 rounded-xl btn-gradient text-sm font-600">
                      <Mic size={16} /> Start Recording
                    </button>
                  )}
                </div>
              )}

              {/* Upload mode */}
              {mode === "upload" && (
                <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer hover:border-indigo-500/50 transition-colors" style={{ borderColor: "var(--border-default)" }}>
                  <Upload size={24} className="text-indigo-400" />
                  <div className="text-center">
                    <p className="text-sm font-600 text-white">{uploadedFile ? uploadedFile.name : "Click to upload audio file"}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>MP3, MP4, WAV, WebM supported (max 25MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="audio/*,video/webm,video/mp4" onChange={(e) => setUploadedFile(e.target.files?.[0] || null)} />
                </label>
              )}

              {/* Transcript mode */}
              {mode === "transcript" && (
                <div>
                  <textarea
                    className="w-full h-36 px-4 py-3 rounded-xl text-sm resize-none outline-none"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                    placeholder="Paste your meeting transcript here (minimum 20 characters)…"
                    value={manualTranscript}
                    onChange={(e) => setManualTranscript(e.target.value)}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{manualTranscript.length} characters</p>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <XCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-400">{errorMsg}</p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={
                  (mode === "record" && !recordedBlob && step !== "recording") ||
                  (mode === "upload" && !uploadedFile) ||
                  (mode === "transcript" && manualTranscript.trim().length < 20)
                }
                className="w-full py-3 rounded-xl btn-gradient font-600 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <XCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-600 text-red-400">Generation Failed</p>
                  <p className="text-xs mt-1 text-red-400/70">{errorMsg}</p>
                </div>
              </div>
              <button onClick={() => { setStep("idle"); setErrorMsg(""); }} className="w-full py-2.5 rounded-xl text-sm font-600 text-white/60 hover:text-white border transition-colors" style={{ borderColor: "var(--border-default)" }}>Try Again</button>
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
  );
}
