import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import { auth } from "@/lib/auth";

// POST /api/meetings/[id]/end — ends a meeting (strictly restricted to the organizer/host who conducted it)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const meeting = await Meeting.findById(id);
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const isOrganizer =
    meeting.organizerId?.toString() === session.user.id ||
    meeting.createdBy?.toString() === session.user.id ||
    session.user.role === "super_admin";

  // Only the organizer who conducted the meeting (or super admin) can end it
  if (!isOrganizer) {
    return NextResponse.json(
      { error: "Only the host who conducted this meeting can end it." },
      { status: 403 }
    );
  }

  // Update meeting status to Completed
  meeting.status = "Completed";
  meeting.endTime = meeting.endTime || new Date().toLocaleTimeString("en-US", { hour12: false });
  await meeting.save();

  return NextResponse.json({
    success: true,
    meeting,
  });
}
