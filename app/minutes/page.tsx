import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, Search, FileText, Sparkles } from "lucide-react";
import connectDB from "@/lib/mongodb";
import Minutes from "@/models/Minutes";
import Link from "next/link";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/models/User";
import DeleteMinutesButton from "@/components/minutes/DeleteMinutesButton";
import { getAccessibleMeetingIds, isAdmin } from "@/lib/meetingAccess";

export const metadata: Metadata = { title: "Minutes" };
export const dynamic = "force-dynamic";

export default async function MinutesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  await connectDB();
  const role = session.user.role as UserRole;
  const userIsAdmin = isAdmin(role);
  const params = await searchParams;

  const accessibleIds = await getAccessibleMeetingIds(session.user.id, role);
  let filter: any = {};
  if (accessibleIds !== null) {
    filter.meetingId = { $in: accessibleIds };
  }
  if (params.status) {
    filter.status = params.status;
  }

  const minutesList = await Minutes.find(filter)
    .populate({
      path: "meetingId",
      select: "title date status meetingType organizerId",
      populate: { path: "organizerId", select: "name email" },
    })
    .populate("draftedBy", "name")
    .populate("approvedBy", "name")
    .sort({ updatedAt: -1 })
    .lean();

  return (
    <AppShell title="Meeting Minutes">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-700 text-white tracking-tight">Minutes of Meeting</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {!userIsAdmin
                ? "Official records for meetings you attended."
                : "Manage drafts and published meeting records."}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search minutes..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {minutesList.length === 0 ? (
            <div
              className="py-20 flex flex-col items-center justify-center text-center rounded-2xl border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(124,58,237,0.1))",
                  border: "1px solid rgba(99,102,241,0.2)",
                }}
              >
                <BookOpen size={28} className="text-indigo-400/50" />
              </div>
              <h3 className="text-lg font-600 text-white mb-2">No minutes found</h3>
              <p className="text-sm max-w-sm" style={{ color: "var(--text-muted)" }}>
                {!userIsAdmin
                  ? "No official minutes have been published for your meetings yet."
                  : "Generate minutes from a completed meeting to see them here."}
              </p>
            </div>
          ) : (
            minutesList.map((m: any) => {
              const meetingObj = m.meetingId as any;
              const meetingOrganizerId = meetingObj?.organizerId?._id?.toString() ?? meetingObj?.organizerId?.toString();
              const authorId = (m.draftedBy as any)?._id?.toString() ?? m.draftedBy?.toString();

              const canDelete =
                meetingOrganizerId === session.user.id ||
                authorId === session.user.id ||
                userIsAdmin ||
                hasPermission(role, "minutes:delete");

              return (
                <Link key={m._id.toString()} href={`/minutes/${m._id}`} className="block">
                  <div
                    className="group p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-purple-500/5 hover:border-purple-500/30 cursor-pointer shadow-xs"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}
                      >
                        <FileText size={20} className="text-white/60 group-hover:text-purple-400 transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap mb-1">
                          <h3 className="font-600 text-white group-hover:text-purple-300 transition-colors truncate">
                            {meetingObj?.title || "Meeting"}
                          </h3>
                          <StatusBadge status={m.status} />
                          {m.generatedByAI && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-600 uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              <Sparkles size={10} /> AI Draft
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs flex-wrap text-slate-500 dark:text-white/50">
                          {meetingObj?.date && (
                            <span>
                              {new Date(meetingObj.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                          <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                          <span>Drafted by {(m.draftedBy as any)?.name || "Unknown"}</span>
                          {m.approvedBy && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                              <span>Approved by {(m.approvedBy as any)?.name}</span>
                            </>
                          )}
                          {m.publishedAt && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                              <span>
                                Published{" "}
                                {new Date(m.publishedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className="text-xs font-600 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                        View Details &rarr;
                      </span>
                      <DeleteMinutesButton
                        minutesId={m._id.toString()}
                        meetingTitle={meetingObj?.title}
                        canDelete={canDelete}
                      />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Draft:     "bg-gray-500/20 text-gray-400 border-gray-500/30",
    Review:    "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Approved:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Published: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  const color = colors[status] || colors.Draft;
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-600 uppercase tracking-wider border ${color}`}>
      {status}
    </span>
  );
}
