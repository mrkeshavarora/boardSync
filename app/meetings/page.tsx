import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, Plus, User, Clock } from "lucide-react";
import DeleteMeetingButton from "@/components/meetings/DeleteMeetingButton";
import JoinLinkButton from "@/components/meetings/JoinLinkButton";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import MeetingParticipant from "@/models/MeetingParticipant";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { getAccessibleMeetingIds } from "@/lib/meetingAccess";

export const metadata: Metadata = { title: "Meetings" };

export default async function MeetingsPage() {
  try {
    const session = await auth();
    if (!session) redirect("/login");

    await connectDB();
    const canDelete = hasPermission(session.user.role as UserRole, "meetings:delete");

    const accessibleIds = await getAccessibleMeetingIds(session.user.id, session.user.role as UserRole);
    const query: any = {};
    if (accessibleIds !== null) {
      query._id = { $in: accessibleIds };
    }

    const meetings = await Meeting.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("organizerId", "name email");

    return (
      <AppShell title="Meetings">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-xs sm:text-sm text-white/50">Manage board meetings and invite connections.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/meetings/new" className="btn-gradient flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-600">
                <Plus size={14} /> New Meeting
              </Link>
            </div>
          </div>

          {meetings.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] p-12 flex flex-col items-center justify-center text-center" style={{ background: "var(--bg-card)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg,rgba(79,70,229,0.2),rgba(124,58,237,0.1))", border: "1px solid rgba(79,70,229,0.2)" }}>
                <CalendarDays size={24} className="text-indigo-400" />
              </div>
              <h3 className="text-base font-600 text-white mb-1">No meetings created yet</h3>
              <p className="text-xs text-white/40 max-w-sm">Create a meeting and invite your connected users so they can receive the join link and RSVP.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {meetings.map((meeting) => {
                const statusStr = meeting.status || "Scheduled";
                const isCompleted = statusStr.toLowerCase().includes("complete");
                const isInProgress = statusStr.toLowerCase().includes("progress");

                return (
                  <Link
                    href={`/meetings/${meeting._id.toString()}`}
                    key={meeting._id.toString()}
                    className="block rounded-2xl border border-white/[0.08] p-4 bg-white/[0.02] hover:bg-purple-500/5 hover:border-purple-500/30 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span suppressHydrationWarning className="inline-flex items-center gap-1 text-[11px] font-500 text-slate-500 dark:text-white/40">
                            <Clock size={11} className="shrink-0" />
                            {meeting.date && !isNaN(new Date(meeting.date).getTime())
                              ? new Date(meeting.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "No Date"}
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-white/40 truncate">
                            <User size={11} className="shrink-0" />
                            {(meeting.organizerId as any)?.name ?? "Unknown"}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-600 text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                          {meeting.title}
                        </h3>
                        {meeting.description && (
                          <p className="text-xs text-slate-500 dark:text-white/50 mt-1 line-clamp-1">
                            {meeting.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-600 border",
                          isInProgress
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30"
                            : isCompleted
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30"
                        )}>
                          {statusStr}
                        </span>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {meeting.onlineMeeting && (
                            <JoinLinkButton href={meeting.onlineMeeting} />
                          )}
                          <DeleteMeetingButton
                            meetingId={meeting._id.toString()}
                            meetingTitle={meeting.title}
                            canDelete={canDelete || meeting.organizerId?._id?.toString() === session.user.id || meeting.organizerId?.toString() === session.user.id}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>
    );
  } catch (error: any) {
    return (
      <AppShell title="Error">
        <div className="p-8 text-red-400">
          <h1 className="text-2xl font-bold mb-4">Error loading meetings</h1>
          <p className="mb-4">{error.message}</p>
          <pre className="bg-red-950/30 p-4 rounded-lg overflow-auto whitespace-pre-wrap text-sm border border-red-500/20 text-red-300">{error.stack}</pre>
        </div>
      </AppShell>
    );
  }
}
