"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, X, FileText, Send, Users } from "lucide-react";

interface PublishConfirmModalProps {
  meetingTitle: string;
  minutesId: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function PublishConfirmModal({
  meetingTitle,
  minutesId,
  onConfirm,
  onClose,
}: PublishConfirmModalProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    setErrorMsg("");

    try {
      await onConfirm();
      setSuccess(true);
      setTimeout(() => {
        onClose();
        // The parent component should handle data refresh/redirect
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to publish minutes.");
      setIsPublishing(false);
    }
  };

  if (success) {
    if (typeof document === "undefined") return null;
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}>
        <div className="w-full max-w-sm rounded-2xl border p-8 flex flex-col items-center text-center animate-fade-in" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/20 mb-4">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-lg font-700 text-white mb-2">Minutes Published</h3>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Participants have been notified.</p>
        </div>
      </div>,
      document.body
    );
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-md rounded-2xl border shadow-2xl animate-fade-in" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <FileText size={18} className="text-amber-400" />
            </div>
            <div>
              <h2 className="font-700 text-white text-base">Publish Minutes</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Official Record</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isPublishing} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-white/80 leading-relaxed">
            You are about to publish the official minutes for <strong className="text-white">{meetingTitle}</strong>.
          </p>

          <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-500/90 font-600">This action is irreversible.</p>
            </div>
            <ul className="text-xs text-amber-500/70 space-y-1.5 pl-6 list-disc">
              <li>The document will become the official meeting record.</li>
              <li>Further edits will be locked.</li>
              <li>All attendees will receive an email notification.</li>
              <li>The minutes will be visible to all Board Members.</li>
            </ul>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <Send size={16} className="text-indigo-400" />
            <div className="flex-1">
              <p className="text-xs font-600 text-white">Email Notifications</p>
              <p className="text-xs text-white/50">Will be sent to all participants automatically.</p>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 text-center">{errorMsg}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isPublishing}
              className="flex-1 py-2.5 rounded-xl text-sm font-600 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex-1 py-2.5 rounded-xl text-sm font-600 text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPublishing ? (
                <>Publishing...</>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Confirm & Publish
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
