"use client";

import { useState, useEffect } from "react";
import { Save, Send, CheckCircle2, Clock, FileText, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "Draft" | "Review" | "Approved";

const STATUS_STYLES: Record<Status, string> = {
  Draft: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Review: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const TOOLBAR_ACTIONS = [
  { label: "B", action: "bold", title: "Bold" },
  { label: "I", action: "italic", title: "Italic" },
  { label: "U", action: "underline", title: "Underline" },
];

export default function MinutesEditor({ meetingId }: { meetingId: string }) {
  const [status, setStatus] = useState<Status>("Draft");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Mock initial content
  const [content, setContent] = useState(`<h2>Meeting Minutes — Q3 Strategy Review</h2>
<p><strong>Date:</strong> August 15, 2026</p>
<p><strong>Time:</strong> 10:00 AM – 12:00 PM UTC</p>
<p><strong>Location:</strong> Boardroom A, 1st Floor HQ</p>
<p><strong>Presiding:</strong> Alexandra Chen, Chairperson</p>

<h3>1. Call to Order</h3>
<p>The meeting was called to order at 10:05 AM by the Chairperson. A quorum was confirmed with 10 of 12 board members present.</p>

<h3>2. Approval of Previous Minutes</h3>
<p>The minutes from the Q2 Board Meeting held on May 18, 2026 were reviewed. No amendments were proposed.</p>
<p><em>Motion: To approve the minutes as presented.</em><br>
Proposed by: James Miller | Seconded by: Sarah Kim | Result: Passed (10–0)</p>

<h3>3. Q3 Financial Performance Review</h3>
<p>Robert Davis, CFO, presented the Q3 financial summary. Revenue came in at $12.4M, representing a 14% increase year-over-year. EBITDA margin improved to 22%.</p>
<p>Key highlights:</p>
<ul>
  <li>Revenue: $12.4M (+14% YoY)</li>
  <li>Operating Expenses: $9.7M (+6% YoY)</li>
  <li>Net Profit: $2.7M (+38% YoY)</li>
</ul>

<h3>4. Any Other Business</h3>
<p>No other items were raised.</p>

<h3>5. Adjournment</h3>
<p>The meeting was adjourned at 11:58 AM by the Chairperson.</p>

<p><em>Minutes prepared by: Sarah Kim, Board Secretary</em></p>`);

  useEffect(() => {
    async function loadMinutes() {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/minutes`);
        if (res.ok) {
          const data = await res.json();
          if (data.minutes && data.minutes.content) {
            setContent(data.minutes.content);
            setStatus(data.minutes.status as Status);
          }
        }
      } catch (err) {
        console.error("Failed to load minutes", err);
      }
    }
    loadMinutes();
  }, [meetingId]);

  const handleSave = async (newStatus?: Status) => {
    setIsSaving(true);
    const saveStatus = newStatus || status;
    try {
      const res = await fetch(`/api/meetings/${meetingId}/minutes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, status: saveStatus }),
      });
      if (res.status === 404) {
        // If not found, create it
        await fetch(`/api/meetings/${meetingId}/minutes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, status: saveStatus }),
        });
      }
      setLastSaved(new Date());
      if (newStatus) setStatus(newStatus);
    } catch (err) {
      console.error("Failed to save minutes", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    await handleSave("Review");
  };

  const handleApprove = async () => {
    await handleSave("Approved");
  };

  const execCommand = (command: string) => {
    document.execCommand(command, false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.06]" style={{ background: "var(--bg-card)" }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <FileText size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-700 text-white">Meeting Minutes</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn("badge text-xs", STATUS_STYLES[status])}>
                {status === "Approved" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                {status}
              </span>
              {lastSaved && (
                <span className="text-xs text-white/30">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-3 py-2 rounded-lg text-sm font-500 text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors flex items-center gap-2"
          >
            <Save size={14} />
            {isSaving ? "Saving..." : "Save Draft"}
          </button>

          {status === "Draft" && (
            <button
              onClick={handleSubmitForReview}
              className="px-3 py-2 rounded-lg text-sm font-500 text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center gap-2"
            >
              <Send size={14} />
              Submit for Review
            </button>
          )}

          {status === "Review" && (
            <button
              onClick={handleApprove}
              className="btn-gradient px-3 py-2 rounded-lg text-sm font-600 flex items-center gap-2"
            >
              <CheckCircle2 size={14} />
              Approve Minutes
            </button>
          )}
        </div>
      </div>

      {/* Rich Text Editor */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "var(--bg-card)" }}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.06] bg-white/[0.02] flex-wrap">
          {TOOLBAR_ACTIONS.map((t) => (
            <button
              key={t.action}
              onClick={() => execCommand(t.action)}
              title={t.title}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-600 text-white/60 hover:bg-white/[0.1] hover:text-white transition-colors"
            >
              {t.label}
            </button>
          ))}
          <div className="w-px h-5 bg-white/[0.08] mx-1" />
          {["h2", "h3", "p"].map((tag) => (
            <button
              key={tag}
              onClick={() => document.execCommand("formatBlock", false, tag)}
              className="px-2 h-8 rounded-lg flex items-center justify-center text-xs font-500 text-white/60 hover:bg-white/[0.1] hover:text-white transition-colors"
            >
              {tag.toUpperCase()}
            </button>
          ))}
          <div className="w-px h-5 bg-white/[0.08] mx-1" />
          <button
            onClick={() => execCommand("insertUnorderedList")}
            className="px-2 h-8 rounded-lg text-xs font-500 text-white/60 hover:bg-white/[0.1] hover:text-white transition-colors"
          >
            • List
          </button>
          <button
            onClick={() => execCommand("insertOrderedList")}
            className="px-2 h-8 rounded-lg text-xs font-500 text-white/60 hover:bg-white/[0.1] hover:text-white transition-colors"
          >
            1. List
          </button>
        </div>

        {/* Editable content area */}
        <div
          contentEditable={status !== "Approved"}
          suppressContentEditableWarning
          onInput={(e) => setContent(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: content }}
          className={cn(
            "min-h-[60vh] p-8 text-white/80 text-sm leading-relaxed focus:outline-none",
            "prose prose-invert max-w-none",
            "[&_h2]:text-xl [&_h2]:font-700 [&_h2]:text-white [&_h2]:mb-4 [&_h2]:mt-6",
            "[&_h3]:text-base [&_h3]:font-600 [&_h3]:text-white/90 [&_h3]:mb-3 [&_h3]:mt-6",
            "[&_p]:mb-3 [&_p]:text-white/70 [&_p]:leading-relaxed",
            "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ul]:text-white/70",
            "[&_li]:mb-1",
            "[&_strong]:text-white [&_em]:text-white/60",
            status === "Approved" && "cursor-default opacity-80"
          )}
        />
      </div>
    </div>
  );
}
