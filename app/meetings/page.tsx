import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, Plus, Link as LinkIcon } from "lucide-react";
import StartMeetingButton from "@/components/meetings/StartMeetingButton";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import Link from "next/link";

export const metadata: Metadata = { title: "Meetings" };

export default async function MeetingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await connectDB();
  const canReadAll = hasPermission(session.user.role as UserRole, "meetings:read");
  const meetings = canReadAll
    ? await Meeting.find({}).sort({ createdAt: -1 }).limit(50).populate("organizerId", "name email")
    : [];

  return (
    <AppShell title="Meetings">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/40">Manage board meetings and invite connections.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/meetings/new" className="btn-gradient flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600">
              <Plus size={15} /> New Meeting
            </Link>
            <StartMeetingButton />
          </div>
        </div>

        {meetings.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] p-16 flex flex-col items-center justify-center text-center" style={{ background: "var(--bg-card)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg,rgba(79,70,229,0.2),rgba(124,58,237,0.1))", border: "1px solid rgba(79,70,229,0.2)" }}>
              <CalendarDays size={28} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-600 text-white mb-2">No meetings created yet</h3>
            <p className="text-sm text-white/40 max-w-sm">Create a meeting and invite your connected users so they can receive the join link and RSVP.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <Link href={`/meetings/${meeting._id.toString()}`} key={meeting._id.toString()} className="block rounded-3xl border border-white/[0.06] p-6 bg-white/[0.02] hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all cursor-pointer">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/50">{new Date(meeting.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    <h3 className="text-xl font-700 text-white">{meeting.title}</h3>
                    <p className="text-sm text-white/40 mt-2">{meeting.description ?? "No description provided."}</p>
                  </div>
                  <div className="text-right">
                    <span className="badge bg-indigo-500/10 text-indigo-300 border-indigo-500/20">{meeting.status}</span>
                    {meeting.onlineMeeting && (
                      <div className="mt-3 inline-flex items-center gap-2 text-sm text-indigo-300">
                        <LinkIcon size={14} />
                        <span className="underline underline-offset-4">
                          Join link
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/60">
                  <span>Organizer: {(meeting.organizerId as any)?.name ?? "Unknown"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
