import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ActionItem from "@/models/ActionItem";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";

const VALID_STATUSES = ["Open", "In Progress", "Completed", "Cancelled", "Overdue"] as const;
type ActionStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid action ID" }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!VALID_STATUSES.includes(status as ActionStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const role = session.user.role as UserRole;
    const canUpdateAll = hasPermission(role, "actions:update:all");

    // Build query — admins can update any action, members only their own
    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!canUpdateAll) {
      query.assignedTo = userId;
    }

    const actionItem = await ActionItem.findOne(query);
    if (!actionItem) {
      return NextResponse.json(
        { error: "Action item not found or you don't have permission to update it" },
        { status: 404 }
      );
    }

    actionItem.status = status as ActionStatus;
    if (status === "Completed") {
      actionItem.completedAt = new Date();
    } else if (actionItem.completedAt && status !== "Completed") {
      actionItem.completedAt = undefined;
    }

    await actionItem.save();

    return NextResponse.json({
      success: true,
      id: actionItem._id.toString(),
      status: actionItem.status,
      completedAt: actionItem.completedAt ?? null,
    });
  } catch (error) {
    console.error("Error updating action status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
