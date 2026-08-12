"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, FileText, CheckCircle2, AlertTriangle,
  Save, Loader2, Send, Edit3, Gavel, Lightbulb, Target,
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
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
      </AppShell>
    );
  }

  if (!minutes) {
    return (
      <AppShell title="Not Found">
        <div className="py-20 text-center">
          <p className="text-white/50">{errorMsg || "Minutes not found or you lack permission."}</p>
          <button onClick={() => router.push("/minutes")} className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm">
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
        year: "numeric", month: "long", day: "numeric",
      })
    : "N/A";

  return (
    <AppShell title={`Minutes: ${meeting?.title || "Meeting"}`}>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">

        {/* Back + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => router.push("/minutes")}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors self-start"
          >
            <ChevronLeft size={16} /> Back to Minutes
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            {(isDraftOrReview || isApproved || isPublished) && (
              <MinutesPDFDownload minutes={minutes} />
            )}
            {isDraftOrReview && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-600 transition-colors"
              >
                <Edit3 size={16} /> Edit Draft
              </button>
            )}
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-600 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            )}
            {isDraftOrReview && !isEditing && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-600 transition-colors disabled:opacity-60"
              >
                {approving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Approve Minutes
              </button>
            )}
            {isApproved && (
              <button
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-600 transition-colors"
              >
                <Send size={16} /> Publish &amp; Notify
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
            <AlertTriangle size={16} className="shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* AI Draft governance notice */}
        {minutes.generatedByAI && !isPublished && (
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-600 text-amber-500">AI-Generated Draft</p>
              <p className="text-xs text-amber-500/80 mt-1">
                These minutes were drafted by AI from the meeting transcript. Review for accuracy, edit if necessary, and approve before publishing.
              </p>
            </div>
          </div>
        )}

        {/* ── Main Document ── */}
        <div className="rounded-2xl border p-6 sm:p-8 space-y-10" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>

          {/* Header */}
          <div className="border-b pb-6" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <StatusPill status={minutes.status} />
              {minutes.generatedByAI && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-600 uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Generated
                </span>
              )}
              <span className="text-xs text-white/30">ID: {minutes._id}</span>
            </div>
            <h1 className="text-3xl font-700 text-white tracking-tight mb-5">
              {meeting?.title || "Board Meeting"}
            </h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <MetaField label="Date"        value={meetingDateStr} />
              <MetaField label="Type"        value={meeting?.meetingType || "Board Meeting"} />
              <MetaField label="Location"    value={meeting?.location || meeting?.onlineMeeting || "Virtual"} />
              <MetaField label="Drafted By"  value={minutes.draftedBy?.name || "Unknown"} />
              <MetaField label="Approved By" value={minutes.approvedBy?.name || "Pending"} />
              {minutes.approvedAt && (
                <MetaField label="Approved At" value={new Date(minutes.approvedAt).toLocaleDateString()} />
              )}
              {minutes.publishedAt && (
                <MetaField label="Published"   value={new Date(minutes.publishedAt).toLocaleDateString()} />
              )}
            </div>
          </div>

          {/* Meeting Summary */}
          <Section title="Meeting Summary" icon={<FileText size={18} className="text-indigo-400" />}>
            {isEditing ? (
              <textarea
                className="w-full h-28 p-3 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-indigo-500 resize-none"
                value={editedData.meetingSummary || ""}
                onChange={(e) => setEditedData({ ...editedData, meetingSummary: e.target.value })}
              />
            ) : (
              <p className="text-sm leading-relaxed text-white/80">{minutes.meetingSummary || "No summary provided."}</p>
            )}
          </Section>

          {/* Attendance */}
          <Section title="Attendance" icon={<CheckCircle2 size={18} className="text-emerald-400" />}>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
              <table className="w-full text-sm text-left">
                <thead className="bg-white/[0.02] border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <tr>
                    <th className="px-4 py-3 font-600 text-white/60">Name</th>
                    <th className="px-4 py-3 font-600 text-white/60">Role</th>
                    <th className="px-4 py-3 font-600 text-white/60">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {editedData.attendees?.map((a: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.01]">
                      <td className="px-4 py-3 font-500 text-white">{a.name}</td>
                      <td className="px-4 py-3 text-white/60">{a.role || "-"}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            className="bg-transparent border border-white/20 rounded p-1 text-xs text-white"
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
                          <span className={`px-2 py-0.5 rounded text-[10px] font-600 uppercase ${
                            a.attendanceStatus === "Present"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : a.attendanceStatus === "Excused"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {a.attendanceStatus}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!editedData.attendees || editedData.attendees.length === 0) && (
                    <tr><td colSpan={3} className="px-4 py-5 text-center text-white/40">No attendance data recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Agenda & Discussions */}
          <Section title="Agenda &amp; Discussions" icon={<FileText size={18} className="text-blue-400" />}>
            <div className="space-y-4">
              {editedData.agendaItems?.map((item: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border bg-white/[0.02]" style={{ borderColor: "var(--border-subtle)" }}>
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        className="w-full p-2 bg-black/20 border border-white/10 rounded font-600 text-white text-sm outline-none focus:border-indigo-500"
                        value={item.title}
                        onChange={(e) => {
                          const arr = [...editedData.agendaItems];
                          arr[i] = { ...arr[i], title: e.target.value };
                          setEditedData({ ...editedData, agendaItems: arr });
                        }}
                      />
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Discussion</label>
                        <textarea
                          className="w-full p-2 h-20 bg-black/20 border border-white/10 rounded text-sm text-white resize-none outline-none focus:border-indigo-500"
                          value={item.discussionSummary}
                          onChange={(e) => {
                            const arr = [...editedData.agendaItems];
                            arr[i] = { ...arr[i], discussionSummary: e.target.value };
                            setEditedData({ ...editedData, agendaItems: arr });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Decision</label>
                        <input
                          className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm text-white outline-none focus:border-indigo-500"
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
                      <h4 className="font-600 text-indigo-300 mb-2">{i + 1}. {item.title}</h4>
                      <div className="pl-4 border-l-2 border-indigo-500/30 space-y-2">
                        <p className="text-sm text-white/80">
                          <strong className="text-white/50">Discussion:</strong>{" "}
                          {item.discussionSummary || "None recorded."}
                        </p>
                        <p className="text-sm text-white/80">
                          <strong className="text-emerald-400/80">Decision:</strong>{" "}
                          {item.decision || "No formal decision."}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(!editedData.agendaItems || editedData.agendaItems.length === 0) && (
                <p className="text-sm text-white/40">No agenda discussions recorded.</p>
              )}
            </div>
          </Section>

          {/* Key Decisions */}
          {(editedData.keyDecisions?.length > 0 || isEditing) && (
            <Section title="Key Decisions" icon={<Lightbulb size={18} className="text-yellow-400" />}>
              <div className="space-y-2">
                {editedData.keyDecisions?.map((decision: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-700 flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {isEditing ? (
                      <input
                        className="flex-1 p-1 bg-black/20 border border-white/10 rounded text-sm text-white outline-none focus:border-indigo-500"
                        value={decision}
                        onChange={(e) => {
                          const arr = [...editedData.keyDecisions];
                          arr[i] = e.target.value;
                          setEditedData({ ...editedData, keyDecisions: arr });
                        }}
                      />
                    ) : (
                      <p className="text-sm text-white/80 flex-1">{decision}</p>
                    )}
                  </div>
                ))}
                {(!editedData.keyDecisions || editedData.keyDecisions.length === 0) && (
                  <p className="text-sm text-white/40">No key decisions recorded.</p>
                )}
              </div>
            </Section>
          )}

          {/* Resolutions */}
          {(editedData.resolutions?.length > 0 || isEditing) && (
            <Section title="Resolutions" icon={<Gavel size={18} className="text-purple-400" />}>
              <div className="space-y-3">
                {editedData.resolutions?.map((res: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl border bg-white/[0.02]" style={{ borderColor: "var(--border-subtle)" }}>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          className="w-full p-2 bg-black/20 border border-white/10 rounded font-600 text-white text-sm outline-none focus:border-indigo-500"
                          value={res.title}
                          placeholder="Resolution title"
                          onChange={(e) => {
                            const arr = [...editedData.resolutions];
                            arr[i] = { ...arr[i], title: e.target.value };
                            setEditedData({ ...editedData, resolutions: arr });
                          }}
                        />
                        <textarea
                          className="w-full p-2 h-16 bg-black/20 border border-white/10 rounded text-sm text-white resize-none outline-none focus:border-indigo-500"
                          value={res.description}
                          placeholder="Description"
                          onChange={(e) => {
                            const arr = [...editedData.resolutions];
                            arr[i] = { ...arr[i], description: e.target.value };
                            setEditedData({ ...editedData, resolutions: arr });
                          }}
                        />
                        <select
                          className="bg-transparent border border-white/20 rounded p-1.5 text-xs text-white"
                          value={res.status}
                          onChange={(e) => {
                            const arr = [...editedData.resolutions];
                            arr[i] = { ...arr[i], status: e.target.value };
                            setEditedData({ ...editedData, resolutions: arr });
                          }}
                        >
                          <option value="Passed">Passed</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Deferred">Deferred</option>
                          <option value="Tabled">Tabled</option>
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="font-600 text-purple-300">{res.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-700 uppercase shrink-0 ${
                            res.status === "Passed"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : res.status === "Rejected"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {res.status}
                          </span>
                        </div>
                        {res.description && (
                          <p className="text-sm text-white/70 pl-0">{res.description}</p>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {(!editedData.resolutions || editedData.resolutions.length === 0) && (
                  <p className="text-sm text-white/40">No resolutions recorded.</p>
                )}
              </div>
            </Section>
          )}

          {/* Action Items */}
          <Section title="Action Items" icon={<Target size={18} className="text-red-400" />}>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
              <table className="w-full text-sm text-left">
                <thead className="bg-white/[0.02] border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <tr>
                    <th className="px-4 py-3 font-600 text-white/60 w-2/5">Task</th>
                    <th className="px-4 py-3 font-600 text-white/60">Assigned To</th>
                    <th className="px-4 py-3 font-600 text-white/60">Due Date</th>
                    <th className="px-4 py-3 font-600 text-white/60">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {editedData.actionItems?.map((a: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.01]">
                      <td className="px-4 py-3 font-500 text-white">
                        {isEditing ? (
                          <input
                            className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-indigo-500"
                            value={a.task}
                            onChange={(e) => {
                              const arr = [...editedData.actionItems];
                              arr[i] = { ...arr[i], task: e.target.value };
                              setEditedData({ ...editedData, actionItems: arr });
                            }}
                          />
                        ) : a.task}
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {isEditing ? (
                          <input
                            className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-indigo-500"
                            value={a.assignedTo}
                            onChange={(e) => {
                              const arr = [...editedData.actionItems];
                              arr[i] = { ...arr[i], assignedTo: e.target.value };
                              setEditedData({ ...editedData, actionItems: arr });
                            }}
                          />
                        ) : (a.assignedTo || "-")}
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {isEditing ? (
                          <input
                            type="date"
                            className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-indigo-500"
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-600 uppercase ${
                          a.priority === "High"
                            ? "bg-red-500/20 text-red-400"
                            : a.priority === "Medium"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {a.priority || "Medium"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!editedData.actionItems || editedData.actionItems.length === 0) && (
                    <tr><td colSpan={4} className="px-4 py-5 text-center text-white/40">No action items assigned.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Next Meeting + Closing Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Section title="Next Meeting" icon={<FileText size={18} className="text-white/40" />}>
              {isEditing ? (
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  value={editedData.nextMeeting || ""}
                  onChange={(e) => setEditedData({ ...editedData, nextMeeting: e.target.value })}
                  placeholder="Date or description of next meeting"
                />
              ) : (
                <p className="text-sm text-white/80">{minutes.nextMeeting || "Not specified."}</p>
              )}
            </Section>
            <Section title="Closing Remarks" icon={<FileText size={18} className="text-white/40" />}>
              {isEditing ? (
                <textarea
                  className="w-full h-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white resize-none outline-none focus:border-indigo-500"
                  value={editedData.closingRemarks || ""}
                  onChange={(e) => setEditedData({ ...editedData, closingRemarks: e.target.value })}
                  placeholder="Closing remarks"
                />
              ) : (
                <p className="text-sm text-white/80">{minutes.closingRemarks || "None."}</p>
              )}
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
    <div>
      <h3 className="text-base font-600 text-white mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/40 mb-0.5">{label}</p>
      <p className="text-sm font-500 text-white">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Draft:     "bg-gray-500/20 text-gray-400 border-gray-500/30",
    Review:    "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Approved:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Published: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-700 uppercase border ${colors[status] || colors.Draft}`}>
      {status}
    </span>
  );
}
