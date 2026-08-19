"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles, Lock, Send, FileText, Loader2, Copy, Check, HelpCircle,
  ListOrdered, RefreshCw, AlertCircle, Bot, User, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocumentChatProps {
  /** Single document name or multiple document names */
  documentName?: string | string[] | null;
  /** Explicit array or string of selected document names */
  documentNames?: string[] | string | null;
  /** Optional meetingId to limit document search */
  meetingId?: string;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional handler triggered when submitting a question */
  onSendMessage?: (question: string, selectedDocs: string[]) => void;
  /** Optional container class overrides */
  className?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  modelUsed?: string;
  timestamp: Date;
}

export default function DocumentChat({
  documentName,
  documentNames,
  meetingId,
  placeholder,
  onSendMessage,
  className,
}: DocumentChatProps) {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const executeQuery = async (queryText: string, mode: "qa" | "generate-questions" | "summary" | "key-points" = "qa") => {
    if (!queryText.trim() || count === 0) return;
    setErrorMsg(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: queryText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setLoading(true);

    if (onSendMessage) {
      onSendMessage(queryText.trim(), selectedList);
    }

    try {
      const res = await fetch("/api/documents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: queryText.trim(),
          documentNames: selectedList,
          meetingId,
          mode,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.status === 504 || res.status === 408
            ? "Request timed out while analyzing documents. Try selecting fewer documents at once."
            : `Server returned error status (${res.status}). Please check your AI API key in Admin Settings.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status}): Failed to generate answer from documents.`);
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.answer || "No response received.",
        sources: data.sources || [],
        modelUsed: data.modelUsed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("Document Chat RAG Error:", err);
      setErrorMsg(err.message || "Failed to get AI answer from document.");
      const errorResponse: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `⚠️ ${err.message || "An error occurred while analyzing the document."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;
    executeQuery(chatInput, "qa");
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    setErrorMsg(null);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] p-4 sm:p-5 bg-white/[0.015] backdrop-blur-sm space-y-3.5 shadow-xl flex flex-col",
        className
      )}
    >
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm sm:text-base font-600 text-white flex items-center gap-1.5">
            Ask about {count > 1 ? "these documents" : "this document"}
          </h4>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-indigo-500/15 border border-indigo-500/25 text-indigo-300">
            <Sparkles size={11} className="text-indigo-400" />
            RAG AI Assistant
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1 px-2 rounded-lg text-[11px] font-500 text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear conversation"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium text-white/50 bg-white/[0.03] border border-white/[0.08]">
            <Lock size={11} className="text-white/40" />
            {count > 1
              ? `${count} Docs Selected`
              : count === 1
              ? "1 Doc Selected"
              : "No Doc Selected"}
          </div>
        </div>
      </div>

      {/* Selected Document List Indicator */}
      <div className="space-y-1.5">
        {count === 0 ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-300/80 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
            <AlertCircle size={13} className="shrink-0" />
            <span>Select one or more documents to ask questions or generate review questions.</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 max-h-20 overflow-y-auto pr-1 custom-scrollbar">
            <span className="text-[11px] text-white/40 font-500">Target:</span>
            {selectedList.map((name, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[10.5px] font-500 text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 max-w-[200px] truncate"
                title={name}
              >
                <FileText size={10} className="shrink-0 text-indigo-400" />
                <span className="truncate">{name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Suggestion Chips */}
      {count > 0 && messages.length === 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] text-white/40 font-500">Quick Prompts:</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => executeQuery("Generate 5 critical analytical review questions and answers based on this document.", "generate-questions")}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg text-[11px] font-500 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <HelpCircle size={12} className="text-indigo-400" />
              <span>🎯 Generate 5 Review Questions</span>
            </button>

            <button
              onClick={() => executeQuery("Provide an executive summary of this document with key takeaways and numbers.", "summary")}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg text-[11px] font-500 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ListOrdered size={12} className="text-cyan-400" />
              <span>📋 Summarize Document</span>
            </button>

            <button
              onClick={() => executeQuery("Extract all key decisions, action items, financial metrics, and deadlines from this document.", "key-points")}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg text-[11px] font-500 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={12} className="text-emerald-400" />
              <span>⚡ Key Decisions & Action Items</span>
            </button>
          </div>
        </div>
      )}

      {/* Messages Conversation Feed */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-64 sm:max-h-80 overflow-y-auto pr-1.5 custom-scrollbar p-1">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={cn("flex flex-col space-y-1", isUser ? "items-end" : "items-start")}
              >
                <div className="flex items-center gap-1 text-[10px] text-white/40 px-1">
                  {isUser ? (
                    <>
                      <User size={10} className="text-indigo-300" />
                      <span>You</span>
                    </>
                  ) : (
                    <>
                      <Bot size={10} className="text-cyan-300" />
                      <span>AI Document Assistant</span>
                      {msg.modelUsed && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-white/[0.06] text-white/50 border border-white/10">
                          {msg.modelUsed}
                        </span>
                      )}
                    </>
                  )}
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                <div
                  className={cn(
                    "px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[92%] break-words whitespace-pre-wrap",
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20"
                      : "bg-white/[0.05] border border-white/[0.08] text-white/90 rounded-tl-sm shadow-inner"
                  )}
                >
                  {msg.content}

                  {/* Sources & Copy */}
                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2 flex-wrap text-[10px]">
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex items-center gap-1 text-white/40 truncate">
                          <FileText size={10} className="shrink-0 text-indigo-400" />
                          <span className="truncate">Sources: {msg.sources.join(", ")}</span>
                        </div>
                      )}

                      <button
                        onClick={() => copyToClipboard(msg.id, msg.content)}
                        className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-auto flex items-center gap-1 cursor-pointer"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-start space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-white/40 px-1">
                <Bot size={10} className="text-cyan-300" />
                <span>Reading document & thinking...</span>
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white/[0.05] border border-white/[0.08] text-xs text-white/70 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-indigo-400" />
                <span>Searching document chunks with RAG...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

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
          disabled={count === 0 || loading}
          className="w-full bg-transparent px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none pr-11 disabled:cursor-not-allowed disabled:placeholder-white/20"
        />
        <button
          type="submit"
          disabled={count === 0 || !chatInput.trim() || loading}
          aria-label="Send question"
          className="absolute right-1.5 p-1.5 sm:p-2 rounded-lg btn-gradient text-white shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>

      {/* Scope Information */}
      <div className="flex items-center gap-1.5 text-[10.5px] text-white/40">
        <Lock size={11} className="text-white/30 shrink-0" />
        <span>
          Answers are strictly generated from the extracted content of the selected document{count > 1 ? "s" : ""}.
        </span>
      </div>
    </div>
  );
}
