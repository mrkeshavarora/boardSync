import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, Search, FileText, CheckCircle2, Clock, Sparkles } from "lucide-react";
import connectDB from "@/lib/mongodb";
import Minutes from "@/models/Minutes";
import MeetingParticipant from "@/models/MeetingParticipant";
import Link from "next/link";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";

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
    .populate("meetingId", "title date status meetingType")
    .populate("draftedBy", "name")
    .populate("approvedBy", "name")
    .sort({ updatedAt: -1 })
    .lean();

  const total = minutesList.length;
  const drafts = minutesList.filter((m) => m.status === "Draft").length;
  const review = minutesList.filter((m) => m.status === "Review").length;
  const published = minutesList.filter((m) => m.status === "Published").length;

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
                : "Manage drafts, reviews, and published meeting records."}
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

        {/* Stats (admins only) */}
        {userIsAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Minutes" value={total}     icon={BookOpen}     color="text-indigo-400" bg="bg-indigo-500/10" border="border-indigo-500/20" />
            <StatCard title="Drafts"        value={drafts}    icon={FileText}     color="text-gray-400"   bg="bg-gray-500/10"   border="border-gray-500/20" />
            <StatCard title="In Review"     value={review}    icon={Clock}        color="text-amber-400"  bg="bg-amber-500/10"  border="border-amber-500/20" />
            <StatCard title="Published"     value={published} icon={CheckCircle2} color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
          </div>
        )}

        {/* Status Filters */}
        <div className="flex gap-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <FilterTab label="All"       active={!params.status}                    href="/minutes" />
          <FilterTab label="Drafts"    active={params.status === "Draft"}          href="/minutes?status=Draft" />
          <FilterTab label="In Review" active={params.status === "Review"}         href="/minutes?status=Review" />
          <FilterTab label="Approved"  active={params.status === "Approved"}       href="/minutes?status=Approved" />
          <FilterTab label="Published" active={params.status === "Published"}      href="/minutes?status=Published" />
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
            minutesList.map((m: any) => (
              <Link key={m._id.toString()} href={`/minutes/${m._id}`}>
                <div
                  className="group p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white/[0.02] cursor-pointer"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}
                    >
                      <FileText size={20} className="text-white/60" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-600 text-white group-hover:text-indigo-400 transition-colors">
                          {m.meetingId?.title || "Untitled Meeting"}
                        </h3>
                        <StatusBadge status={m.status} />
                        {m.generatedByAI && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-600 uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            <Sparkles size={10} /> AI Draft
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
                        {m.meetingId?.date && (
                          <span>
                            {new Date(m.meetingId.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
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
                  <div className="text-sm font-600 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 shrink-0">
                    View Details &rarr;
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, border }: any) {
  return (
    <div
      className="p-5 rounded-2xl border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-500 text-white/60">{title}</h3>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg} ${border} border`}>
          <Icon size={16} className={color} />
        </div>
      </div>
      <p className="text-3xl font-700 text-white">{value}</p>
    </div>
  );
}

function FilterTab({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`px-4 py-3 text-sm font-600 border-b-2 transition-colors ${
        active ? "border-indigo-500 text-indigo-400" : "border-transparent text-white/50 hover:text-white"
      }`}
    >
      {label}
    </Link>
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
