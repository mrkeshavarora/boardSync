import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, Clock, MapPin, Video, Users, FileText, List, ChevronLeft, Download } from "lucide-react";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import MeetingParticipant from "@/models/MeetingParticipant";
import AgendaItem from "@/models/AgendaItem";
import MeetingDocument from "@/models/Document";
import RSVP from "@/models/RSVP";
import Minutes from "@/models/Minutes";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import StartMeetingBtn from "@/components/meetings/StartMeetingBtn";
import DeleteMeetingBtn from "@/components/meetings/DeleteMeetingBtn";
import RSVPAction from "@/components/meetings/RSVPAction";
import GenerateMinutesBtn from "@/components/minutes/GenerateMinutesBtn";
import SendInviteBtn from "@/components/meetings/SendInviteBtn";
import RejoinMeetingBtn from "@/components/meetings/RejoinMeetingBtn";
import AddAgendaModal from "@/components/meetings/AddAgendaModal";
import AddParticipantModal from "@/components/meetings/AddParticipantModal";

import { canAccessMeeting } from "@/lib/meetingAccess";

export const metadata: Metadata = { title: "Meeting Details" };

export default async function MeetingDetailsPage(
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  await connectDB();
  const role = session.user.role as UserRole;
  
  const hasAccess = await canAccessMeeting(session.user.id, role, params.id);
  if (!hasAccess) {
    redirect("/meetings");
  }

  // Fetch meeting and all related data in parallel
  const [meeting, participants, agenda, documents, rsvps, existingMinutes] = await Promise.all([
    Meeting.findById(params.id).populate("organizerId", "name email avatar"),
    MeetingParticipant.find({ meetingId: params.id }).populate("userId", "name email avatar role"),
    AgendaItem.find({ meetingId: params.id }).sort({ order: 1 }).populate("presenterId", "name email"),
    MeetingDocument.find({ meetingId: params.id }).populate("uploadedBy", "name avatar"),
    RSVP.find({ meetingId: params.id }),
    Minutes.findOne({ meetingId: params.id }).select("_id status").lean(),
  ]);

  if (!meeting) {
    redirect("/meetings");
  }

  const organizer = meeting.organizerId as any;
  const isOrganizer = organizer?._id?.toString() === session.user.id;
  const canManage = isOrganizer || hasPermission(role, "meetings:update");
  const existingUserIds = participants
    .map((p) => (p.userId ? ((p.userId as any)._id ? (p.userId as any)._id.toString() : p.userId.toString()) : null))
    .filter(Boolean) as string[];

  const sentCount = participants.filter((p) => p.invitationStatus === "Sent").length;
  const hasBeenSent = participants.some((p) => p.invitationStatus === "Sent");

  // Build map of user ID -> RSVP status
  const rsvpMap: Record<string, "Pending" | "Accepted" | "Tentative" | "Declined"> = {};
  rsvps.forEach((r) => {
    if (r.userId) {
      const uid = (r.userId as any)._id ? (r.userId as any)._id.toString() : r.userId.toString();
      rsvpMap[uid] = r.status;
    }
  });

  const currentUserRsvp = rsvpMap[session.user.id] || "Pending";

  return (
    <AppShell title="Meeting Details">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Link href="/meetings" className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <span className="text-sm font-500 text-white/50">Back to Meetings</span>
        </div>

        {/* Meeting Header */}
        <div className="meeting-header-card rounded-3xl border border-white/[0.14] p-7 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(51,65,85,0.75) 0%, rgba(30,41,59,0.85) 100%)", backdropFilter: "blur(24px)", boxShadow: "0 0 0 1px rgba(148,163,184,0.12), 0 20px 40px -12px rgba(0,0,0,0.35)" }}>
          {/* Ambient glow orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
          <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)", transform: "translate(-30%, 30%)" }} />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-7">
            {/* Left: Meta */}
            <div className="space-y-5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="meeting-status-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-600 tracking-wide" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  {meeting.status}
                </span>
                <span className="meeting-type-badge inline-flex items-center px-3 py-1 rounded-full text-xs font-500" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                  {meeting.meetingType}
                </span>
              </div>
              
              <div>
                <h1 className="text-3xl font-700 text-white tracking-tight leading-tight">{meeting.title}</h1>
                <p className="text-white/50 text-sm leading-relaxed mt-2">{meeting.description || "No description provided."}</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
                <div className="flex items-center gap-2.5 text-sm text-white/60">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <Calendar size={13} className="text-indigo-400" />
                  </div>
                  <span className="font-400">{new Date(meeting.date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-white/60">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <Clock size={13} className="text-emerald-400" />
                  </div>
                  <span className="font-400">{meeting.startTime} – {meeting.endTime} <span className="text-white/30">({meeting.timezone})</span></span>
                </div>
                {meeting.location && (
                  <div className="flex items-center gap-2.5 text-sm text-white/60">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <MapPin size={13} className="text-amber-400" />
                    </div>
                    <span className="font-400">{meeting.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-col gap-2 min-w-[200px] lg:max-w-[210px] w-full lg:w-auto">
              {/* Send Invite */}
              {isOrganizer && (
                <SendInviteBtn
                  meetingId={params.id}
                  initialSentCount={sentCount}
                  totalParticipants={participants.length}
                  hasBeenSentBefore={hasBeenSent}
                />
              )}
              {/* Start Meeting */}
              {organizer?._id?.toString() === session.user.id && (
                <StartMeetingBtn meetingId={params.id} currentStatus={meeting.status} />
              )}
              {/* Re-join for organizer */}
              {meeting.status === "In Progress" && organizer?._id?.toString() === session.user.id && (
                <RejoinMeetingBtn meetingId={params.id} />
              )}
              {/* Delete */}
              {(organizer?._id?.toString() === session.user.id || hasPermission(role, "meetings:delete")) && (
                <DeleteMeetingBtn meetingId={params.id} />
              )}
              
              {/* Minutes */}
              {existingMinutes ? (
                <Link
                  href={`/minutes/${existingMinutes._id}`}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-600 text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 4px 14px rgba(79,70,229,0.35)" }}
                >
                  <FileText size={13} /> View Minutes <span className="opacity-60 text-[10px]">({existingMinutes.status})</span>
                </Link>
              ) : (
                <>
                  {hasPermission(role, "minutes:generate") && (
                    <GenerateMinutesBtn meetingId={params.id} meetingTitle={meeting.title} />
                  )}
                </>
              )}
              
              {/* Re-join for participants */}
              {meeting.status === "In Progress" && organizer?._id?.toString() !== session.user.id && (
                <RejoinMeetingBtn meetingId={params.id} />
              )}

              {/* Video link */}
              {meeting.onlineMeeting && (
                <a 
                  href={meeting.onlineMeeting} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-600 text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #0ea5e9, #3b82f6)", boxShadow: "0 4px 14px rgba(14,165,233,0.3)" }}
                >
                  <Video size={13} /> Join Video Meeting
                </a>
              )}

              {/* Divider */}
              <div className="h-px w-full mt-1 mb-1" style={{ background: "rgba(255,255,255,0.05)" }} />

              {/* Organizer chip */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-700 text-white shrink-0 shadow-md">
                  {organizer?.avatar ? (
                    <img src={organizer.avatar} alt={organizer.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(organizer?.name || "U")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-white/35 font-500 uppercase tracking-wider">Organizer</p>
                  <p className="text-xs font-600 text-white/80 truncate">{organizer?.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Agenda & Documents */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Agenda */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0A] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <List size={16} />
                  </div>
                  <h2 className="text-lg font-600 text-white">Agenda</h2>
                </div>
                {canManage && <AddAgendaModal meetingId={params.id} />}
              </div>
              <div className="p-6">
                {agenda.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-sm text-white/40">No agenda items added yet.</p>
                    {canManage && (
                      <div className="flex justify-center">
                        <AddAgendaModal meetingId={params.id} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {agenda.map((item, index) => {
                      const presenterName = (item.presenterId as any)?.name || item.presenterName;
                      return (
                        <div key={item._id.toString()} className="flex gap-4 group">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-600 text-white/60 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-colors shrink-0">
                              {index + 1}
                            </div>
                            {index < agenda.length - 1 && <div className="w-px h-full bg-white/[0.06] mt-2" />}
                          </div>
                          <div className="pb-4 flex-1">
                            <h3 className="text-base font-600 text-white">{item.title}</h3>
                            {item.description && <p className="text-sm text-white/50 mt-1">{item.description}</p>}
                            <div className="flex flex-wrap gap-3 mt-3">
                              {item.estimatedDuration && (
                                <span className="text-xs text-white/40 flex items-center gap-1.5"><Clock size={12} /> {item.estimatedDuration} mins</span>
                              )}
                              {presenterName && (
                                <span className="text-xs text-indigo-300/70 flex items-center gap-1.5"><Users size={12} /> {presenterName}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0A] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <FileText size={16} />
                  </div>
                  <h2 className="text-lg font-600 text-white">Documents</h2>
                </div>
                {documents.length > 0 && (
                  <span className="badge bg-white/[0.05] text-white/60">{documents.length}</span>
                )}
              </div>
              <div className="p-6">
                {documents.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-8">No documents attached.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documents.map((doc) => {
                      const uploader = (doc as any).uploadedBy as any;
                      return (
                        <a
                          key={doc._id.toString()}
                          href={doc.storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-start gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-emerald-500/20 transition-all"
                        >
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0 text-[10px] font-700">
                            {doc.fileType?.toUpperCase().slice(0, 4) || <FileText size={18} />}
                          </div>
                          <div className="overflow-hidden flex-1">
                            <p className="text-sm font-500 text-white truncate group-hover:text-emerald-300 transition-colors">{doc.fileName}</p>
                            <p className="text-xs text-white/35 mt-0.5">
                              {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                              {uploader?.name ? ` · ${uploader.name}` : ""}
                            </p>
                            <p className="text-[10px] text-white/25 mt-0.5">
                              {new Date(doc.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <Download size={14} className="text-white/20 group-hover:text-emerald-400 mt-1 shrink-0 transition-colors" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: RSVP & Participants */}
          <div className="space-y-6">
            {/* Interactive RSVP Action Component */}
            <RSVPAction meetingId={params.id} initialStatus={currentUserRsvp} />

            <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0A] overflow-hidden sticky top-6">
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Users size={16} />
                  </div>
                  <h2 className="text-lg font-600 text-white">Participants</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-white/[0.05] text-white/60">{participants.length}</span>
                  {canManage && (
                    <AddParticipantModal
                      meetingId={params.id}
                      existingParticipantUserIds={existingUserIds}
                    />
                  )}
                </div>
              </div>
              <div className="p-4">
                {participants.length === 0 ? (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-sm text-white/40">No participants invited.</p>
                    {canManage && (
                      <div className="flex justify-center">
                        <AddParticipantModal
                          meetingId={params.id}
                          existingParticipantUserIds={existingUserIds}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {participants.map((p) => {
                      const user = p.userId as any;
                      if (!user) return null;
                      const uid = user._id ? user._id.toString() : user.toString();
                      const status = rsvpMap[uid] || "Pending";
                      return (
                        <div key={p._id.toString()} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-600 text-white shrink-0">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                getInitials(user.name)
                              )}
                            </div>
                            <div className="overflow-hidden min-w-0">
                              <p className="text-sm font-500 text-white truncate">{user.name}</p>
                              <p className="text-xs text-white/40 truncate">{p.role}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={
                                status === "Accepted"
                                  ? "text-[10px] font-600 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                  : status === "Tentative"
                                  ? "text-[10px] font-600 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                  : status === "Declined"
                                  ? "text-[10px] font-600 px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20"
                                  : "text-[10px] font-600 px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10"
                              }
                            >
                              {status === "Declined" ? "Cannot Attend" : status === "Accepted" ? "Attending" : status}
                            </span>
                            <span className="text-[9px] font-500 text-white/35">
                              {p.invitationStatus === "Sent"
                                ? "✉️ Invite Sent"
                                : p.invitationStatus === "Failed"
                                ? "⚠️ Invite Failed"
                                : "⏳ Not Sent"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
