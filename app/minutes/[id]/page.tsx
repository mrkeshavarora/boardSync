"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, FileText, CheckCircle2, AlertTriangle, 
  Save, Loader2, Users, Send, Edit3
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
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/minutes/${resolvedParams.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedData),
      });
      if (res.ok) {
        setIsEditing(false);
        fetchMinutes();
      }
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/minutes/${resolvedParams.id}/approve`, { method: "POST" });
      if (res.ok) fetchMinutes();
    } catch (err) {
      console.error("Approve failed", err);
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

  if (!minutes) return <AppShell title="Not Found"><p className="p-8 text-center text-white/50">Minutes not found or you lack permission.</p></AppShell>;

  const meeting = minutes.meetingId;
  const isDraftOrReview = minutes.status === "Draft" || minutes.status === "Review";
  const isApproved = minutes.status === "Approved";
  const isPublished = minutes.status === "Published";

  return (
    <AppShell title={`Minutes: ${meeting?.title || "Meeting"}`}>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button onClick={() => router.push("/minutes")} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
            <ChevronLeft size={16} /> Back to Minutes
          </button>
          <div className="flex items-center gap-3">
            {isPublished && <MinutesPDFDownload minutes={minutes} />}
            {isDraftOrReview && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-600 transition-colors">
                <Edit3 size={16} /> Edit Draft
              </button>
            )}
            {isEditing && (
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-600 transition-colors">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
              </button>
            )}
            {isDraftOrReview && !isEditing && (
              <button onClick={handleApprove} disabled={approving} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-600 transition-colors">
                {approving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Approve Minutes
              </button>
            )}
            {isApproved && (
              <button onClick={() => setShowPublishModal(true)} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-600 transition-colors">
                <Send size={16} /> Publish & Notify
              </button>
            )}
          </div>
        </div>

        {/* Governance Notice */}
        {minutes.generatedByAI && !isPublished && (
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <AlertTriangle size={18} className="text-amber-400 mt-0.5" />
            <div>
              <p className="text-sm font-600 text-amber-500">AI-Generated Draft</p>
              <p className="text-xs text-amber-500/80 mt-1">These minutes were drafted by AI based on the meeting transcript. They must be reviewed for accuracy, edited if necessary, and approved by the Board Secretary before publishing.</p>
            </div>
          </div>
        )}

        {/* Main Document Content */}
        <div className="rounded-2xl border p-8 space-y-10" style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
          
          {/* Header Info */}
          <div className="border-b pb-6" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-700 uppercase ${isPublished ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-500/20 text-gray-400 border border-gray-500/30"}`}>
                {minutes.status}
              </span>
              <span className="text-xs text-white/40">ID: {minutes._id}</span>
            </div>
            <h1 className="text-3xl font-700 text-white tracking-tight mb-4">{meeting?.title || "Board Meeting"}</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-white/40 mb-1">Date</p><p className="font-500">{meeting?.scheduledAt ? new Date(meeting.scheduledAt).toLocaleDateString() : "N/A"}</p></div>
              <div><p className="text-white/40 mb-1">Location</p><p className="font-500">{meeting?.location || meeting?.meetingLink || "Virtual"}</p></div>
              <div><p className="text-white/40 mb-1">Drafted By</p><p className="font-500">{minutes.draftedBy?.name}</p></div>
              <div><p className="text-white/40 mb-1">Approved By</p><p className="font-500">{minutes.approvedBy?.name || "Pending"}</p></div>
            </div>
          </div>

          {/* Editable Sections */}
          <Section title="Meeting Summary">
            {isEditing ? (
              <textarea 
                className="w-full h-24 p-3 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-indigo-500"
                value={editedData.meetingSummary || ""}
                onChange={(e) => setEditedData({...editedData, meetingSummary: e.target.value})}
              />
            ) : <p className="text-sm leading-relaxed text-white/80">{minutes.meetingSummary || "No summary provided."}</p>}
          </Section>

          <Section title="Attendance">
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
                      <td className="px-4 py-3 font-500">{a.name}</td>
                      <td className="px-4 py-3 text-white/60">{a.role || "-"}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select 
                            className="bg-transparent border border-white/20 rounded p-1 text-xs"
                            value={a.attendanceStatus}
                            onChange={(e) => {
                              const newArr = [...editedData.attendees];
                              newArr[i].attendanceStatus = e.target.value;
                              setEditedData({...editedData, attendees: newArr});
                            }}
                          >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Excused">Excused</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-600 uppercase ${a.attendanceStatus === "Present" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                            {a.attendanceStatus}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!editedData.attendees || editedData.attendees.length === 0) && (
                    <tr><td colSpan={3} className="px-4 py-4 text-center text-white/40">No attendance data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Agenda & Discussions">
            <div className="space-y-4">
              {editedData.agendaItems?.map((item: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border bg-white/[0.02]" style={{ borderColor: "var(--border-subtle)" }}>
                  {isEditing ? (
                    <div className="space-y-3">
                      <input className="w-full p-2 bg-black/20 border border-white/10 rounded font-600" value={item.title} onChange={(e) => {
                        const newArr = [...editedData.agendaItems]; newArr[i].title = e.target.value; setEditedData({...editedData, agendaItems: newArr});
                      }} />
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Discussion</label>
                        <textarea className="w-full p-2 h-20 bg-black/20 border border-white/10 rounded text-sm" value={item.discussionSummary} onChange={(e) => {
                          const newArr = [...editedData.agendaItems]; newArr[i].discussionSummary = e.target.value; setEditedData({...editedData, agendaItems: newArr});
                        }} />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Decision</label>
                        <input className="w-full p-2 bg-black/20 border border-white/10 rounded text-sm" value={item.decision} onChange={(e) => {
                          const newArr = [...editedData.agendaItems]; newArr[i].decision = e.target.value; setEditedData({...editedData, agendaItems: newArr});
                        }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-600 text-indigo-300 mb-2">{i + 1}. {item.title}</h4>
                      <div className="pl-4 border-l-2 border-indigo-500/30 space-y-2">
                        <p className="text-sm text-white/80"><strong className="text-white/60">Discussion:</strong> {item.discussionSummary || "None recorded."}</p>
                        <p className="text-sm text-white/80"><strong className="text-emerald-400/80">Decision:</strong> {item.decision || "No formal decision."}</p>
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

          <Section title="Action Items">
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
              <table className="w-full text-sm text-left">
                <thead className="bg-white/[0.02] border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <tr>
                    <th className="px-4 py-3 font-600 text-white/60 w-1/2">Task</th>
                    <th className="px-4 py-3 font-600 text-white/60">Assigned To</th>
                    <th className="px-4 py-3 font-600 text-white/60">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {editedData.actionItems?.map((a: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.01]">
                      <td className="px-4 py-3 font-500">
                        {isEditing ? <input className="w-full bg-black/20 border border-white/10 rounded px-2 py-1" value={a.task} onChange={(e) => {
                          const newArr = [...editedData.actionItems]; newArr[i].task = e.target.value; setEditedData({...editedData, actionItems: newArr});
                        }} /> : a.task}
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {isEditing ? <input className="w-full bg-black/20 border border-white/10 rounded px-2 py-1" value={a.assignedTo} onChange={(e) => {
                          const newArr = [...editedData.actionItems]; newArr[i].assignedTo = e.target.value; setEditedData({...editedData, actionItems: newArr});
                        }} /> : a.assignedTo || "-"}
                      </td>
                      <td className="px-4 py-3 text-white/60">
                         {isEditing ? <input type="date" className="w-full bg-black/20 border border-white/10 rounded px-2 py-1" value={a.dueDate} onChange={(e) => {
                          const newArr = [...editedData.actionItems]; newArr[i].dueDate = e.target.value; setEditedData({...editedData, actionItems: newArr});
                        }} /> : a.dueDate || "-"}
                      </td>
                    </tr>
                  ))}
                  {(!editedData.actionItems || editedData.actionItems.length === 0) && (
                    <tr><td colSpan={3} className="px-4 py-4 text-center text-white/40">No action items assigned.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Section title="Next Meeting">
              {isEditing ? (
                 <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm" value={editedData.nextMeeting || ""} onChange={(e) => setEditedData({...editedData, nextMeeting: e.target.value})} />
              ) : <p className="text-sm text-white/80">{minutes.nextMeeting || "Not specified."}</p>}
            </Section>
            <Section title="Closing Remarks">
               {isEditing ? (
                 <textarea className="w-full h-16 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm resize-none" value={editedData.closingRemarks || ""} onChange={(e) => setEditedData({...editedData, closingRemarks: e.target.value})} />
              ) : <p className="text-sm text-white/80">{minutes.closingRemarks || "None."}</p>}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-600 text-white mb-4 flex items-center gap-2">
        <div className="w-1.5 h-6 rounded-full bg-indigo-500"></div>
        {title}
      </h3>
      {children}
    </div>
  );
}
