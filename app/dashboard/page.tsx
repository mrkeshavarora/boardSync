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

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await connectDB();

  const userId = new mongoose.Types.ObjectId(session.user.id);
  const role = session.user.role as UserRole;
  const now = new Date();
  const canReadAllActions = hasPermission(role, "actions:read:all");

  // Fetch all dashboard data in parallel
  const [
    upcomingMeetings,
    openActionCount,
    overdueActionCount,
    recentActions,
    boardMemberCount,
    pendingRsvpCount,
  ] = await Promise.all([
    // Upcoming & in-progress meetings (next 5, sorted by date)
    Meeting.find({
      status: { $in: ["Scheduled", "In Progress"] },
      date: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
    })
      .sort({ date: 1 })
      .limit(5)
      .populate("organizerId", "name")
      .lean(),

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
      .sort({ dueDate: 1 })
      .limit(4)
      .populate("assignedTo", "name")
      .lean(),

    // Total board members (active users with a board role)
    User.countDocuments({
      status: "active",
      role: { $in: ["super_admin", "admin", "board_secretary", "board_member"] },
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
