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
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import Link from "next/link";
import { getInitials } from "@/lib/utils";
import StartMeetingBtn from "@/components/meetings/StartMeetingBtn";

export const metadata: Metadata = { title: "Meeting Details" };

export default async function MeetingDetailsPage(
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  await connectDB();
  const role = session.user.role as UserRole;
  if (!hasPermission(role, "meetings:read") && !hasPermission(role, "meetings:read:invited")) {
    redirect("/meetings");
  }

  // Fetch meeting and all related data in parallel
  const [meeting, participants, agenda, documents] = await Promise.all([
    Meeting.findById(params.id).populate("organizerId", "name email avatar"),
    MeetingParticipant.find({ meetingId: params.id }).populate("userId", "name email avatar role"),
    AgendaItem.find({ meetingId: params.id }).sort({ order: 1 }).populate("presenterId", "name email"),
    MeetingDocument.find({ meetingId: params.id }),
  ]);

  if (!meeting) {
    redirect("/meetings");
  }

  const organizer = meeting.organizerId as any;

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
        <div className="rounded-3xl border border-white/[0.06] p-8 bg-white/[0.02] relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="badge bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-600">{meeting.status}</span>
                <span className="badge bg-white/[0.04] text-white/60 border-white/[0.1]">{meeting.meetingType}</span>
              </div>
              
              <h1 className="text-3xl font-700 text-white tracking-tight">{meeting.title}</h1>
              <p className="text-white/60 text-base leading-relaxed">{meeting.description || "No description provided."}</p>
              
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-4">
                <div className="flex items-center gap-2.5 text-sm text-white/70">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Calendar size={15} />
                  </div>
                  <span>{new Date(meeting.date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-white/70">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Clock size={15} />
                  </div>
                  <span>{meeting.startTime} - {meeting.endTime} ({meeting.timezone})</span>
                </div>
                {meeting.location && (
                  <div className="flex items-center gap-2.5 text-sm text-white/70">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <MapPin size={15} />
                    </div>
                    <span>{meeting.location}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-[220px]">
              {/* Start Meeting button — only for organizer */}
              {organizer?._id?.toString() === session.user.id && (
                <StartMeetingBtn meetingId={params.id} currentStatus={meeting.status} />
              )}
              {/* Join Room button — for all participants when In Progress */}
              {meeting.status === "In Progress" && organizer?._id?.toString() !== session.user.id && (
                <Link
                  href={`/meetings/${params.id}/room`}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-600 text-sm text-white bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 transition-all"
                >
                  <Video size={18} /> Join Meeting Now
                </Link>
              )}
              {meeting.onlineMeeting && (
                <a 
                  href={meeting.onlineMeeting} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-gradient w-full py-3 rounded-xl flex items-center justify-center gap-2 font-600 shadow-lg shadow-indigo-500/20"
                >
                  <Video size={18} /> Join Video Meeting
                </a>
              )}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-600 text-white shrink-0">
                  {organizer?.avatar ? (
                    <img src={organizer.avatar} alt={organizer.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(organizer?.name || "U")
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-white/50 mb-0.5">Organizer</p>
                  <p className="text-sm font-500 text-white truncate">{organizer?.name}</p>
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
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <List size={16} />
                </div>
                <h2 className="text-lg font-600 text-white">Agenda</h2>
              </div>
              <div className="p-6">
                {agenda.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-8">No agenda items added yet.</p>
                ) : (
                  <div className="space-y-4">
                    {agenda.map((item, index) => (
                      <div key={item._id.toString()} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-600 text-white/60 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-colors shrink-0">
                            {index + 1}
                          </div>
                          {index < agenda.length - 1 && <div className="w-px h-full bg-white/[0.06] mt-2" />}
                        </div>
                        <div className="pb-4">
                          <h3 className="text-base font-600 text-white">{item.title}</h3>
                          {item.description && <p className="text-sm text-white/50 mt-1">{item.description}</p>}
                          <div className="flex flex-wrap gap-3 mt-3">
                            {item.estimatedDuration && (
                              <span className="text-xs text-white/40 flex items-center gap-1.5"><Clock size={12} /> {item.estimatedDuration} mins</span>
                            )}
                            {(item.presenterId as any)?.name && (
                              <span className="text-xs text-indigo-300/70 flex items-center gap-1.5"><Users size={12} /> {(item.presenterId as any).name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0A] overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <FileText size={16} />
                </div>
                <h2 className="text-lg font-600 text-white">Documents</h2>
              </div>
              <div className="p-6">
                {documents.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-8">No documents attached.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documents.map((doc) => (
                      <a 
                        key={doc._id.toString()}
                        href={doc.storageUrl}
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="group flex items-start gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center text-white/40 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="text-sm font-500 text-white truncate">{doc.fileName}</p>
                          <p className="text-xs text-white/40 mt-1 uppercase">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB • {doc.fileType}</p>
                        </div>
                        <Download size={14} className="text-white/20 group-hover:text-white/60 mt-1 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Participants */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0A0A0A] overflow-hidden sticky top-6">
              <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Users size={16} />
                  </div>
                  <h2 className="text-lg font-600 text-white">Participants</h2>
                </div>
                <span className="badge bg-white/[0.05] text-white/60">{participants.length}</span>
              </div>
              <div className="p-4">
                {participants.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-6">No participants invited.</p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {participants.map((p) => {
                      const user = p.userId as any;
                      if (!user) return null;
                      return (
                        <div key={p._id.toString()} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-600 text-white shrink-0">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              getInitials(user.name)
                            )}
                          </div>
                          <div className="overflow-hidden flex-1">
                            <p className="text-sm font-500 text-white truncate">{user.name}</p>
                            <p className="text-xs text-white/40 truncate">{p.role}</p>
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
