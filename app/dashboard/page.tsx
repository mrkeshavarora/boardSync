import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import DashboardContent from "@/components/dashboard/DashboardContent";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import ActionItem from "@/models/ActionItem";
import RSVP from "@/models/RSVP";
import User, { UserRole } from "@/models/User";
import MeetingParticipant from "@/models/MeetingParticipant";
import { hasPermission } from "@/lib/permissions";
import mongoose from "mongoose";

import { getAccessibleMeetingIds } from "@/lib/meetingAccess";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await connectDB();

  const userId = new mongoose.Types.ObjectId(session.user.id);
  const role = session.user.role as UserRole;
  const now = new Date();
  const canReadAllActions = hasPermission(role, "actions:read:all");

  const accessibleIds = await getAccessibleMeetingIds(session.user.id, role);
  const baseFilter: any = {};
  if (accessibleIds !== null) {
    baseFilter._id = { $in: accessibleIds };
  }

  // 1. Query future/today scheduled & in-progress meetings
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let upcomingMeetings = await Meeting.find({
    ...baseFilter,
    status: { $in: ["Scheduled", "In Progress"] },
    date: { $gte: todayMidnight },
  })
    .sort({ date: 1 })
    .limit(5)
    .populate("organizerId", "name")
    .lean();

  // 2. Fallback: If no future meetings match today midnight, query active/scheduled meetings in DB
  if (upcomingMeetings.length === 0) {
    upcomingMeetings = await Meeting.find({
      ...baseFilter,
      status: { $nin: ["Cancelled", "Archived"] },
    })
      .sort({ date: -1, createdAt: -1 })
      .limit(5)
      .populate("organizerId", "name")
      .lean();
  }

  // Fetch remaining dashboard statistics from real database records
  const [
    openActionCount,
    overdueActionCount,
    recentActions,
    boardMemberCount,
    pendingRsvpCount,
  ] = await Promise.all([
    // Open action items count (scoped by role)
    ActionItem.countDocuments({
      status: { $in: ["Open", "In Progress", "Overdue"] },
      ...(canReadAllActions ? {} : { assignedTo: userId }),
    }),

    // Overdue action items count (scoped by role)
    ActionItem.countDocuments({
      status: "Overdue",
      ...(canReadAllActions ? {} : { assignedTo: userId }),
    }),

    // Recent 4 action items (scoped by role)
    ActionItem.find({
      status: { $in: ["Open", "In Progress", "Overdue"] },
      ...(canReadAllActions ? {} : { assignedTo: userId }),
    })
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(4)
      .populate("assignedTo", "name")
      .lean(),

    // Total board members (active users)
    User.countDocuments({
      status: "active",
    }),

    // Pending RSVPs for the current user on upcoming meetings
    RSVP.countDocuments({
      userId,
      status: "Pending",
    }),
  ]);

  // For each upcoming meeting, get participant count
  const meetingIds = upcomingMeetings.map((m: any) => m._id);
  const participantCounts = await MeetingParticipant.aggregate([
    { $match: { meetingId: { $in: meetingIds } } },
    { $group: { _id: "$meetingId", count: { $sum: 1 } } },
  ]);
  const participantMap: Record<string, number> = {};
  participantCounts.forEach((p: any) => {
    participantMap[p._id.toString()] = p.count;
  });

  // Serialize for client component (lean objects have ObjectIds and Dates)
  const serializedMeetings = upcomingMeetings.map((m: any) => ({
    id: m._id.toString(),
    title: m.title,
    date: new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    startTime: m.startTime,
    meetingType: m.meetingType,
    status: m.status,
    attendees: participantMap[m._id.toString()] ?? 0,
  }));

  const serializedActions = recentActions.map((a: any) => ({
    id: a._id.toString(),
    title: a.title,
    assigneeName: (a.assignedTo as any)?.name ?? "Unassigned",
    assigneeId: (a.assignedTo as any)?._id?.toString() ?? "",
    dueDate: a.dueDate
      ? new Date(a.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : null,
    status: a.status as string,
    priority: a.priority as string,
  }));

  return (
    <AppShell title="Dashboard">
      <DashboardContent
        user={session.user}
        upcomingMeetings={serializedMeetings}
        openActionCount={openActionCount}
        overdueActionCount={overdueActionCount}
        recentActions={serializedActions}
        boardMemberCount={boardMemberCount}
        pendingRsvpCount={pendingRsvpCount}
        currentUserId={session.user.id}
      />
    </AppShell>
  );
}
