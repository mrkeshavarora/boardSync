import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Minutes from "@/models/Minutes";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { getAccessibleMeetingIds } from "@/lib/meetingAccess";

// GET /api/minutes — list all minutes the current user may see
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const role = session.user.role as UserRole;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;

  let filter: Record<string, any> = {};

  // Restrict to meetings accessible to the user (organizer or participant)
  const accessibleIds = await getAccessibleMeetingIds(session.user.id, role);
  if (accessibleIds !== null) {
    filter.meetingId = { $in: accessibleIds };
  }

  // Board members can only see Published minutes
  if (role === "board_member") {
    filter.status = "Published";
  } else if (status) {
    filter.status = status;
  }

  const minutes = await Minutes.find(filter)
    .populate("meetingId", "title date scheduledAt status meetingType")
    .populate("draftedBy", "name email")
    .populate("approvedBy", "name email")
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({ minutes });
}
