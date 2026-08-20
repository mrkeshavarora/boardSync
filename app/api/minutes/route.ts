import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Minutes from "@/models/Minutes";
import Meeting from "@/models/Meeting";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";

// GET /api/minutes — list all minutes the current user may see
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const role = session.user.role as UserRole;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;

  let filter: Record<string, any> = {};

  // Board members can only see Published minutes
  if (role === "board_member") {
    filter.status = "Published";
  } else if (status) {
    filter.status = status;
  }

  const minutes = await Minutes.find(filter)
    .populate("meetingId", "title scheduledAt status type")
    .populate("draftedBy", "name email")
    .populate("approvedBy", "name email")
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({ minutes });
}
