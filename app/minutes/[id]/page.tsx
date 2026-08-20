"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronLeft, FileText, CheckCircle2, AlertTriangle,
  Save, Loader2, Send, Edit3, Gavel, Lightbulb, Target,
  Calendar, MapPin, User, ShieldCheck, Clock, Sparkles
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import MinutesPDFDownload from "@/components/minutes/MinutesPDFDownload";
import PublishConfirmModal from "@/components/minutes/PublishConfirmModal";

export default function MinutesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [minutes, setMinutes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchMinutes();
  }, []);

  const fetchMinutes = async () => {
    try {
      const res = await fetch(`/api/minutes/${resolvedParams.id}`);
      if (!res.ok) throw new Error("Failed to load minutes");
      const data = await res.json();
      setMinutes(data.minutes);
      setEditedData(data.minutes);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load minutes. You may not have access.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/minutes/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedData),
      });
      if (res.ok) {
        setIsEditing(false);
        fetchMinutes();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Save failed");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/minutes/${resolvedParams.id}/approve`, { method: "POST" });
      if (res.ok) {
        fetchMinutes();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Approval failed");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setApproving(false);
    }
  };

  const handlePublish = async () => {
    const res = await fetch(`/api/minutes/${resolvedParams.id}/publish`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to publish");
    }
    fetchMinutes();
  };

  if (loading) {
    return (
      <AppShell title="Loading Minutes...">
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      </AppShell>
    );
  }

  if (!minutes) {
    return (
      <AppShell title="Not Found">
        <div className="py-20 text-center">
          <p className="text-slate-500 dark:text-white/50">{errorMsg || "Minutes not found or you lack permission."}</p>
          <button onClick={() => router.push("/minutes")} className="mt-4 text-purple-600 dark:text-purple-400 hover:underline text-sm font-600">
            ← Back to Minutes
          </button>
        </div>
      </AppShell>
    );
  }

  const meeting = minutes.meetingId;
  const isDraftOrReview = minutes.status === "Draft" || minutes.status === "Review";
  const isApproved = minutes.status === "Approved";
  const isPublished = minutes.status === "Published";

  // Resolve meeting date from either `date` or `scheduledAt` field
  const rawDate = meeting?.date ?? meeting?.scheduledAt;
  const meetingDateStr = rawDate
    ? new Date(rawDate).toLocaleDateString("en-US", {
        weekday: "short", year: "numeric", month: "short", day: "numeric",
      })
    : "N/A";

  // Permissions
  const role = session?.user?.role;
  const isBoardMember = role === "board_member" || role === "guest";
  const canEdit = !isBoardMember;
  const canApprove = !isBoardMember;

  return (
    <AppShell title={`Minutes: ${meeting?.title || "Meeting"}`}>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">

        {/* Back + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => router.push("/minutes")}
            className="inline-flex items-center gap-1.5 text-xs font-600 text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-colors self-start cursor-pointer"
          >
            <ChevronLeft size={16} /> Back to Minutes
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            {(isDraftOrReview || isApproved || isPublished) && (
              <MinutesPDFDownload minutes={minutes} />
            )}
            {isDraftOrReview && !isEditing && canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-600 text-slate-800 dark:text-white transition-all cursor-pointer shadow-xs"
              >
                <Edit3 size={14} /> Edit Draft
              </button>
            )}
            {isEditing && canEdit && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl btn-gradient keep-white text-xs font-600 transition-all disabled:opacity-60 cursor-pointer shadow-md shadow-purple-500/20"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            )}
            {isDraftOrReview && !isEditing && canApprove && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-600 transition-all disabled:opacity-60 cursor-pointer shadow-md shadow-emerald-500/20"
              >
                {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Approve Minutes
              </button>
            )}
            {isApproved && canApprove && (
              <button
                onClick={() => setShowPublishModal(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-600 transition-all cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Send size={14} /> Publish &amp; Notify
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 dark:bg-red-500/10 border border-rose-200 dark:border-red-500/20 text-xs font-600 text-rose-700 dark:text-red-300">
            <AlertTriangle size={16} className="shrink-0 text-rose-600 dark:text-red-400" />
            {errorMsg}
          </div>
        )}

        {/* Board Member Notice for Drafts */}
        {isBoardMember && !isPublished && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20">
            <FileText size={18} className="text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-700 text-purple-900 dark:text-purple-300">Draft Pending Approval</p>
              <p className="text-xs text-purple-700 dark:text-purple-300/80 mt-0.5">
                These minutes have been drafted but are not yet officially approved by the Secretary. You will be notified when they are published.
              </p>
            </div>
          </div>
        )}

        {/* AI Draft governance notice */}
        {minutes.generatedByAI && !isPublished && !isBoardMember && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-700 text-amber-900 dark:text-amber-300">AI-Generated Draft</p>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-0.5">
                These minutes were drafted by AI from the meeting transcript. Review for accuracy, edit if necessary, and approve before publishing.
              </p>
            </div>
          </div>
        )}

        {/* ── Main Document Card ── */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-6 sm:p-8 space-y-8 bg-white dark:bg-white/[0.02] shadow-xs relative overflow-hidden">
          
          {/* Top Decorative Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-fuchsia-500" />

          {/* Document Header */}
          <div className="border-b border-slate-200/80 dark:border-white/[0.08] pb-6 space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <StatusPill status={minutes.status} />
              {minutes.generatedByAI && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-700 uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
                  <Sparkles size={11} /> AI Generated
                </span>
              )}
              <span className="text-[11px] font-500 text-slate-500 dark:text-white/40 ml-auto">ID: {minutes._id}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-700 text-slate-900 dark:text-white tracking-tight leading-tight">
              {meeting?.title || "Board Meeting"}
            </h1>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <MetaCard icon={<Calendar size={14} className="text-purple-600 dark:text-purple-400" />} label="Date" value={meetingDateStr} />
              <MetaCard icon={<Clock size={14} className="text-indigo-600 dark:text-indigo-400" />} label="Type" value={meeting?.meetingType || "Board Meeting"} />
              <MetaCard icon={<MapPin size={14} className="text-blue-600 dark:text-blue-400" />} label="Location" value={meeting?.location || meeting?.onlineMeeting || "Virtual"} />
              <MetaCard icon={<User size={14} className="text-emerald-600 dark:text-emerald-400" />} label="Drafted By" value={minutes.draftedBy?.name || "Unknown"} />
              <MetaCard icon={<ShieldCheck size={14} className="text-fuchsia-600 dark:text-fuchsia-400" />} label="Approved By" value={minutes.approvedBy?.name || "Pending"} />
              {minutes.approvedAt && (
                <MetaCard icon={<Clock size={14} className="text-slate-600 dark:text-white/50" />} label="Approved At" value={new Date(minutes.approvedAt).toLocaleDateString()} />
              )}
              {minutes.publishedAt && (
                <MetaCard icon={<Clock size={14} className="text-slate-600 dark:text-white/50" />} label="Published" value={new Date(minutes.publishedAt).toLocaleDateString()} />
              )}
            </div>
          </div>

          {/* Meeting Summary */}
          <Section title="Meeting Summary" icon={<FileText size={16} />}>
            {isEditing ? (
              <textarea
                className="w-full h-28 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500 resize-none font-500"
                value={editedData.meetingSummary || ""}
                onChange={(e) => setEditedData({ ...editedData, meetingSummary: e.target.value })}
              />
            ) : (
              <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-white/80 font-500">
                {minutes.meetingSummary || "No summary provided."}
              </p>
            )}
          </Section>

          {/* Attendance */}
          <Section title="Attendance" icon={<CheckCircle2 size={16} />}>
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/90 dark:bg-white/[0.04] border-b border-slate-200/80 dark:border-white/[0.08]">
                  <tr>
                    <th className="px-4 py-3 font-700 text-slate-700 dark:text-white/80">Name</th>
                    <th className="px-4 py-3 font-700 text-slate-700 dark:text-white/80">Role</th>
                    <th className="px-4 py-3 font-700 text-slate-700 dark:text-white/80">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.06] bg-white dark:bg-transparent">
                  {editedData.attendees?.map((a: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-600 text-slate-900 dark:text-white">{a.name}</td>
                      <td className="px-4 py-3 font-500 text-slate-600 dark:text-white/60 capitalize">{a.role ? a.role.replace(/_/g, " ") : "-"}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded px-2 py-1 text-xs text-slate-900 dark:text-white"
                            value={a.attendanceStatus}
                            onChange={(e) => {
                              const arr = [...editedData.attendees];
                              arr[i] = { ...arr[i], attendanceStatus: e.target.value };
                              setEditedData({ ...editedData, attendees: arr });
                            }}
                          >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Excused">Excused</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-700 uppercase tracking-wide border ${
                            a.attendanceStatus === "Present"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                              : a.attendanceStatus === "Excused"
                              ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                              : "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
                          }`}>
                            {a.attendanceStatus}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!editedData.attendees || editedData.attendees.length === 0) && (
                    <tr><td colSpan={3} className="px-4 py-5 text-center text-slate-500 dark:text-white/40">No attendance data recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Agenda & Discussions */}
          <Section title="Agenda & Discussions" icon={<FileText size={16} />}>
            <div className="space-y-3">
              {editedData.agendaItems?.map((item: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] space-y-2">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        className="w-full p-2 bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded font-600 text-slate-900 dark:text-white text-xs outline-none focus:border-purple-500"
                        value={item.title}
                        onChange={(e) => {
                          const arr = [...editedData.agendaItems];
                          arr[i] = { ...arr[i], title: e.target.value };
                          setEditedData({ ...editedData, agendaItems: arr });
                        }}
                      />
                      <div>
                        <label className="text-[11px] font-600 text-slate-600 dark:text-white/40 mb-1 block">Discussion</label>
                        <textarea
                          className="w-full p-2 h-20 bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded text-xs text-slate-900 dark:text-white resize-none outline-none focus:border-purple-500"
                          value={item.discussionSummary}
                          onChange={(e) => {
                            const arr = [...editedData.agendaItems];
                            arr[i] = { ...arr[i], discussionSummary: e.target.value };
                            setEditedData({ ...editedData, agendaItems: arr });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-600 text-slate-600 dark:text-white/40 mb-1 block">Decision</label>
                        <input
                          className="w-full p-2 bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
                          value={item.decision}
                          onChange={(e) => {
                            const arr = [...editedData.agendaItems];
                            arr[i] = { ...arr[i], decision: e.target.value };
                            setEditedData({ ...editedData, agendaItems: arr });
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-700 text-purple-700 dark:text-purple-300 text-sm">{i + 1}. {item.title}</h4>
                      <div className="pl-3.5 border-l-2 border-purple-400/40 space-y-2 pt-1">
                        <p className="text-xs text-slate-700 dark:text-white/80 leading-relaxed">
                          <strong className="text-slate-900 dark:text-white/60 font-600">Discussion:</strong>{" "}
                          {item.discussionSummary || "None recorded."}
                        </p>
                        {item.decision && (
                          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-600 text-emerald-800 dark:text-emerald-300">
                            <strong>Decision:</strong> {item.decision}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(!editedData.agendaItems || editedData.agendaItems.length === 0) && (
                <p className="text-xs text-slate-500 dark:text-white/40">No agenda discussions recorded.</p>
              )}
            </div>
          </Section>

          {/* Key Decisions */}
          {(editedData.keyDecisions?.length > 0 || isEditing) && (
            <Section title="Key Decisions" icon={<Lightbulb size={16} />}>
              <div className="space-y-2">
                {editedData.keyDecisions?.map((decision: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {i + 1}
                    </span>
                    {isEditing ? (
                      <input
                        className="flex-1 p-1.5 bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
                        value={decision}
                        onChange={(e) => {
                          const arr = [...editedData.keyDecisions];
                          arr[i] = e.target.value;
                          setEditedData({ ...editedData, keyDecisions: arr });
                        }}
                      />
                    ) : (
                      <p className="text-xs font-600 text-amber-900 dark:text-amber-200 flex-1">{decision}</p>
                    )}
                  </div>
                ))}
                {(!editedData.keyDecisions || editedData.keyDecisions.length === 0) && (
                  <p className="text-xs text-slate-500 dark:text-white/40">No key decisions recorded.</p>
                )}
              </div>
            </Section>
          )}

          {/* Action Items */}
          <Section title="Action Items" icon={<Target size={16} />}>
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/90 dark:bg-white/[0.04] border-b border-slate-200/80 dark:border-white/[0.08]">
                  <tr>
                    <th className="px-4 py-3 font-700 text-slate-700 dark:text-white/80 w-2/5">Task</th>
                    <th className="px-4 py-3 font-700 text-slate-700 dark:text-white/80">Assigned To</th>
                    <th className="px-4 py-3 font-700 text-slate-700 dark:text-white/80">Due Date</th>
                    <th className="px-4 py-3 font-700 text-slate-700 dark:text-white/80">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.06] bg-white dark:bg-transparent">
                  {editedData.actionItems?.map((a: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-600 text-slate-900 dark:text-white">
                        {isEditing ? (
                          <input
                            className="w-full bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
                            value={a.task}
                            onChange={(e) => {
                              const arr = [...editedData.actionItems];
                              arr[i] = { ...arr[i], task: e.target.value };
                              setEditedData({ ...editedData, actionItems: arr });
                            }}
                          />
                        ) : a.task}
                      </td>
                      <td className="px-4 py-3 font-500 text-slate-600 dark:text-white/70">
                        {isEditing ? (
                          <input
                            className="w-full bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
                            value={a.assignedTo}
                            onChange={(e) => {
                              const arr = [...editedData.actionItems];
                              arr[i] = { ...arr[i], assignedTo: e.target.value };
                              setEditedData({ ...editedData, actionItems: arr });
                            }}
                          />
                        ) : (a.assignedTo || "-")}
                      </td>
                      <td className="px-4 py-3 font-500 text-slate-600 dark:text-white/70">
                        {isEditing ? (
                          <input
                            type="date"
                            className="bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
                            value={a.dueDate}
                            onChange={(e) => {
                              const arr = [...editedData.actionItems];
                              arr[i] = { ...arr[i], dueDate: e.target.value };
                              setEditedData({ ...editedData, actionItems: arr });
                            }}
                          />
                        ) : (a.dueDate || "-")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-700 uppercase tracking-wide border ${
                          a.priority === "High"
                            ? "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
                            : a.priority === "Medium"
                            ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                            : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30"
                        }`}>
                          {a.priority || "Medium"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!editedData.actionItems || editedData.actionItems.length === 0) && (
                    <tr><td colSpan={4} className="px-4 py-5 text-center text-slate-500 dark:text-white/40">No action items assigned.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Next Meeting + Closing Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <Section title="Next Meeting" icon={<FileText size={16} />}>
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
                {isEditing ? (
                  <input
                    className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-purple-500"
                    value={editedData.nextMeeting || ""}
                    onChange={(e) => setEditedData({ ...editedData, nextMeeting: e.target.value })}
                    placeholder="Date or description of next meeting"
                  />
                ) : (
                  <p className="text-xs font-500 text-slate-700 dark:text-white/80">{minutes.nextMeeting || "Not specified."}</p>
                )}
              </div>
            </Section>

            <Section title="Closing Remarks" icon={<FileText size={16} />}>
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
                {isEditing ? (
                  <textarea
                    className="w-full h-20 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white resize-none outline-none focus:border-purple-500"
                    value={editedData.closingRemarks || ""}
                    onChange={(e) => setEditedData({ ...editedData, closingRemarks: e.target.value })}
                    placeholder="Closing remarks"
                  />
                ) : (
                  <p className="text-xs font-500 text-slate-700 dark:text-white/80">{minutes.closingRemarks || "None."}</p>
                )}
              </div>
            </Section>
          </div>

        </div>
      </div>

      {showPublishModal && (
        <PublishConfirmModal
          meetingTitle={meeting?.title || "Meeting"}
          minutesId={minutes._id}
          onConfirm={handlePublish}
          onClose={() => setShowPublishModal(false)}
        />
      )}
    </AppShell>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 shrink-0">
          {icon}
        </div>
        <h3 className="text-base font-700 text-slate-900 dark:text-white tracking-tight">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function MetaCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02]">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[11px] font-600 text-slate-500 dark:text-white/40 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-xs font-700 text-slate-900 dark:text-white truncate">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Draft:     "bg-slate-100 text-slate-800 border-slate-300 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30",
    Review:    "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
    Approved:  "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
    Published: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-700 uppercase tracking-wider border ${colors[status] || colors.Draft}`}>
      {status}
    </span>
  );
}
