import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import connectDB from "@/lib/mongodb";
import ActionItem from "@/models/ActionItem";
import Meeting from "@/models/Meeting";
import User, { UserRole } from "@/models/User";
import { hasPermission } from "@/lib/permissions";
import mongoose from "mongoose";
import ActionsContent, { ActionItemData, ActionStats } from "@/components/actions/ActionsContent";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = { title: "My Actions — BoardSync" };

export default async function ActionsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await connectDB();

  const userId = new mongoose.Types.ObjectId(session.user.id);
  const role = session.user.role as UserRole;
  const canReadAll = hasPermission(role, "actions:read:all");
  const canUpdateAll = hasPermission(role, "actions:update:all");

  // Build query scoped by role
  const query: any = canReadAll ? {} : { assignedTo: userId };

  // Fetch all action items with populated fields
  const rawActions = await ActionItem.find(query)
    .populate("assignedTo", "name")
    .populate("meetingId", "title")
    .sort({ dueDate: 1, createdAt: -1 })
    .limit(200)
    .lean();

  // Compute stats
  const total = rawActions.length;
  const open = rawActions.filter((a: any) => a.status === "Open").length;
  const inProgress = rawActions.filter((a: any) => a.status === "In Progress").length;
  const overdue = rawActions.filter((a: any) => a.status === "Overdue").length;
  const completed = rawActions.filter((a: any) => a.status === "Completed").length;
  const completionRate =
    total > 0 ? Math.round(((completed) / total) * 100) : 0;

  const stats: ActionStats = { total, open, inProgress, overdue, completed, completionRate };

  // Serialize for client component
  const actions: ActionItemData[] = rawActions.map((a: any) => {
    const assignee = a.assignedTo as any;
    const meeting = a.meetingId as any;
    const assigneeName: string = assignee?.name ?? "Unassigned";
    const assigneeId: string = assignee?._id?.toString() ?? "";
    const isAssignedToMe = assigneeId === session.user.id;
    const dueDateRaw: string | null = a.dueDate
      ? new Date(a.dueDate).toISOString()
      : null;
    const dueDate: string | null = a.dueDate
      ? new Date(a.dueDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

    return {
      id: a._id.toString(),
      title: a.title,
      description: a.description ?? undefined,
      assigneeName,
      assigneeId,
      assigneeInitials: assigneeName !== "Unassigned" ? getInitials(assigneeName) : "??",
      meetingTitle: meeting?.title ?? "Unknown Meeting",
      meetingId: meeting?._id?.toString() ?? "",
      dueDate,
      dueDateRaw,
      priority: (a.priority ?? "Medium") as ActionItemData["priority"],
      status: (a.status ?? "Open") as ActionItemData["status"],
      createdAt: new Date(a.createdAt).toISOString(),
      isAssignedToMe,
    };
  });

  return (
    <AppShell title="My Actions">
      <ActionsContent
        actions={actions}
        stats={stats}
        currentUserId={session.user.id}
        canUpdateAll={canUpdateAll}
      />
    </AppShell>
  );
}
