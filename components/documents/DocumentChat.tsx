"use client";

import React, { useState } from "react";
import { Sparkles, Lock, Send, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocumentChatProps {
  /** Single document name or multiple document names */
  documentName?: string | string[] | null;
  /** Explicit array or string of selected document names */
  documentNames?: string[] | string | null;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional handler triggered when submitting a question */
  onSendMessage?: (question: string, selectedDocs: string[]) => void;
  /** Optional container class overrides */
  className?: string;
}

export default function DocumentChat({
  documentName,
  documentNames,
  placeholder,
  onSendMessage,
  className,
}: DocumentChatProps) {
  const [chatInput, setChatInput] = useState("");

  // Normalize selected document names
  const selectedList: string[] = React.useMemo(() => {
    const rawList = documentNames ?? documentName;
    if (!rawList) return [];
    if (Array.isArray(rawList)) {
      return rawList.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
    if (typeof rawList === "string" && rawList.trim().length > 0) {
      return [rawList.trim()];
    }
    return [];
  }, [documentName, documentNames]);

  const count = selectedList.length;

  const defaultPlaceholder =
    placeholder ||
    (count > 1
      ? "Ask questions across selected documents..."
      : count === 1
      ? "Ask something about this document..."
      : "Select documents to start asking questions...");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (onSendMessage) {
      onSendMessage(chatInput.trim(), selectedList);
    }
    // Future RAG / backend connection point
    setChatInput("");
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] p-5 sm:p-6 bg-white/[0.015] backdrop-blur-sm space-y-4 shadow-xl",
        className
      )}
    >
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h4 className="text-base font-600 text-white flex items-center gap-2">
            Ask about {count > 1 ? "these documents" : "this document"}
          </h4>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 border border-indigo-500/25 text-indigo-300">
            <Sparkles size={12} className="text-indigo-400" />
            AI Assistant
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-white/50 bg-white/[0.03] border border-white/[0.08] self-start sm:self-auto">
          <Lock size={12} className="text-white/40" />
          {count > 1
            ? `Answers limited to ${count} selected documents`
            : count === 1
            ? "Answers limited to this document only"
            : "No document selected"}
        </div>
      </div>

      {/* Description & Selected Document Context */}
      <div className="space-y-2">
        <p className="text-sm text-white/60 leading-relaxed">
          Ask questions about the selected document{count > 1 ? "s" : ""}. The assistant will only answer based on the content of {count > 1 ? "these documents" : "this document"}.
        </p>

        {count === 0 ? (
          <div className="inline-flex items-center gap-2 text-xs text-amber-300/80 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
            <span>No documents selected. Select one or more documents from above to ask questions.</span>
          </div>
        ) : count === 1 ? (
          <div className="inline-flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20 max-w-full">
            <span className="text-white/40 shrink-0">Selected document:</span>
            <span className="font-500 text-white truncate">{selectedList[0]}</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <span className="text-xs text-white/40 font-500 block">
              Selected documents ({count}):
            </span>
            <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto pr-1">
              {selectedList.map((name, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[11px] font-500 text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20 max-w-[200px] sm:max-w-[260px] truncate"
                  title={name}
                >
                  <FileText size={11} className="shrink-0 text-indigo-400" />
                  <span className="truncate">{name}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Horizontal Chat Input */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center rounded-xl border border-white/[0.1] bg-[#0b1021]/80 shadow-inner focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all group"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={defaultPlaceholder}
          disabled={count === 0}
          className="w-full bg-transparent px-4 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none pr-12 disabled:cursor-not-allowed disabled:placeholder-white/20"
        />
        <button
          type="submit"
          disabled={count === 0}
          aria-label="Send question"
          className="absolute right-2 p-2 rounded-lg btn-gradient text-white shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={15} />
        </button>
      </form>

      {/* Scope Information */}
      <div className="flex items-center gap-1.5 text-xs text-white/40">
        <Lock size={12} className="text-white/30 shrink-0" />
        <span>
          The assistant will only answer based on the content of the selected document{count > 1 ? "s" : ""}.
        </span>
      </div>
    </div>
  );
}
