"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles, Send, Bot, User, Lock, AlertCircle, FileText,
  Trash2, Loader2, HelpCircle, ListOrdered, Copy, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocumentChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: string;
}

interface DocumentChatProps {
  selectedDocIds?: string[];
  documents?: Array<{ _id: string; title: string; filename?: string }>;
  documentNames?: string[];
  meetingId?: string;
  placeholder?: string;
  defaultPlaceholder?: string;
  className?: string;
}

export default function DocumentChat({
  selectedDocIds = [],
  documents = [],
  documentNames = [],
  meetingId,
  placeholder,
  defaultPlaceholder = "Ask questions across selected documents...",
  className,
}: DocumentChatProps) {
  const [messages, setMessages] = useState<DocumentChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const count = selectedDocIds.length || documentNames.length;
  const selectedList = documents.length > 0
    ? documents.filter((d) => selectedDocIds.includes(d._id)).map((d) => d.title || d.filename || "Untitled")
    : documentNames;
  const activePlaceholder = placeholder || defaultPlaceholder;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const executeQuery = async (queryText: string, mode: "qa" | "summary" | "generate-questions" | "key-points") => {
    if (!queryText.trim() || count === 0 || loading) return;

    setErrorMsg(null);
    const userMsgId = Date.now().toString();
    const userMessage: DocumentChatMessage = {
      id: userMsgId,
      role: "user",
      content: queryText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/documents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: selectedDocIds,
          message: queryText,
          mode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to query document AI.");
      }

      const data = await res.json();
      const botMessage: DocumentChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "No answer generated.",
        sources: data.sources || [],
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to query documents.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        "rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-4 sm:p-5 bg-white dark:bg-white/[0.02] shadow-xs space-y-3.5 flex flex-col",
        className
      )}
    >
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm sm:text-base font-700 text-slate-900 dark:text-white flex items-center gap-1.5">
            Ask about {count > 1 ? "these documents" : "this document"}
          </h4>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-700 uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200 dark:bg-indigo-500/15 dark:border-indigo-500/25 dark:text-indigo-300">
            <Sparkles size={11} className="text-purple-600 dark:text-indigo-400" />
            AI Assistant
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1 px-2 rounded-lg text-[11px] font-600 text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear conversation"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-600 text-slate-700 dark:text-white/60 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
            <Lock size={11} className="text-slate-500 dark:text-white/40" />
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
          <div className="inline-flex items-center gap-1.5 text-xs font-600 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20">
            <AlertCircle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Select one or more documents to ask questions or generate review questions.</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 max-h-20 overflow-y-auto pr-1 custom-scrollbar">
            <span className="text-[11px] text-slate-500 dark:text-white/50 font-600">Target:</span>
            {selectedList.map((name, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[11px] font-600 text-purple-800 bg-purple-100/90 border border-purple-200 dark:text-indigo-300 dark:bg-indigo-500/15 dark:border-indigo-500/20 px-2.5 py-0.5 rounded-md max-w-[200px] truncate"
                title={name}
              >
                <FileText size={11} className="shrink-0 text-purple-600 dark:text-indigo-400" />
                <span className="truncate">{name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Suggestion Chips */}
      {count > 0 && messages.length === 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] text-slate-500 dark:text-white/50 font-600">Quick Prompts:</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => executeQuery("Generate 5 critical analytical review questions and answers based on this document.", "generate-questions")}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-xs font-600 bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 dark:text-indigo-300 dark:border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <HelpCircle size={13} className="text-purple-600 dark:text-indigo-400" />
              <span>🎯 Generate 5 Review Questions</span>
            </button>

            <button
              onClick={() => executeQuery("Provide an executive summary of this document with key takeaways and numbers.", "summary")}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-xs font-600 bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border border-cyan-200 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25 dark:text-cyan-300 dark:border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <ListOrdered size={13} className="text-cyan-700 dark:text-cyan-400" />
              <span>📋 Summarize Document</span>
            </button>

            <button
              onClick={() => executeQuery("Extract all key decisions, action items, financial metrics, and deadlines from this document.", "key-points")}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-xs font-600 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:text-emerald-300 dark:border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Sparkles size={13} className="text-emerald-700 dark:text-emerald-400" />
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
                <div className="flex items-center gap-1 text-[10px] font-600 text-slate-500 dark:text-white/40 px-1">
                  {isUser ? (
                    <>
                      <User size={10} className="text-purple-600 dark:text-indigo-300" />
                      <span>You</span>
                    </>
                  ) : (
                    <>
                      <Bot size={10} className="text-cyan-600 dark:text-cyan-300" />
                      <span>AI Assistant</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                <div
                  className={cn(
                    "px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[92%] break-words whitespace-pre-wrap font-500",
                    isUser
                      ? "btn-gradient keep-white rounded-tr-sm shadow-md shadow-purple-500/20"
                      : "bg-slate-100 text-slate-900 border border-slate-200 dark:bg-white/[0.05] dark:border-white/[0.08] dark:text-white/90 rounded-tl-sm shadow-2xs"
                  )}
                >
                  {msg.content}

                  {/* Sources & Copy */}
                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-2 flex-wrap text-[10px]">
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex items-center gap-1 text-slate-500 dark:text-white/40 truncate">
                          <FileText size={10} className="shrink-0 text-purple-600 dark:text-indigo-400" />
                          <span className="truncate">Sources: {msg.sources.join(", ")}</span>
                        </div>
                      )}

                      <button
                        onClick={() => copyToClipboard(msg.id, msg.content)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors ml-auto flex items-center gap-1 cursor-pointer"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? <Check size={11} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={11} />}
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
              <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-white/40 px-1">
                <Bot size={10} className="text-cyan-600 dark:text-cyan-300" />
                <span>Reading document & thinking...</span>
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-800 dark:text-white/70 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-purple-600 dark:text-indigo-400" />
                <span>Searching document chunks...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Horizontal Chat Input */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0b1021]/80 shadow-2xs focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all group p-1"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={activePlaceholder}
          disabled={count === 0 || loading}
          className="w-full bg-transparent px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none pr-12 disabled:cursor-not-allowed font-500"
        />
        <button
          type="submit"
          disabled={count === 0 || !chatInput.trim() || loading}
          aria-label="Send question"
          className="absolute right-1.5 p-2 rounded-xl btn-gradient keep-white shadow-md shadow-purple-500/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white" />}
        </button>
      </form>

      {/* Scope Information */}
      <div className="flex items-center gap-1.5 text-[11px] font-500 text-slate-500 dark:text-white/40">
        <Lock size={11} className="text-slate-400 dark:text-white/30 shrink-0" />
        <span>
          Answers are strictly generated from the extracted content of the selected document{count > 1 ? "s" : ""}.
        </span>
      </div>
    </div>
  );
}
