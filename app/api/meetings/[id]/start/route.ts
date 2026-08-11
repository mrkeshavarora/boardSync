import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import MeetingParticipant from "@/models/MeetingParticipant";
import Notification from "@/models/Notification";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

// POST /api/meetings/[id]/start — starts a meeting and notifies all participants
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

  // Only the organizer can start the meeting
  if (meeting.organizerId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Only the organizer can start this meeting." }, { status: 403 });
  }

  if (meeting.status === "In Progress") {
    return NextResponse.json({ error: "Meeting is already in progress." }, { status: 409 });
  }

  // Update meeting status to In Progress
  meeting.status = "In Progress";
  await meeting.save();

  // Fetch all participants
  const participants = await MeetingParticipant.find({ meetingId: id });

  // Create a notification for each participant (excluding the organizer)
  const notificationDocs = participants
    .filter((p) => p.userId.toString() !== session.user.id)
    .map((p) => ({
      userId: p.userId,
      type: "meeting" as const,
      title: `Meeting Started: ${meeting.title}`,
      body: `The meeting "${meeting.title}" has been started by the organizer. Click to join now.`,
      link: `/meetings/${id}`,
      read: false,
    }));

  if (notificationDocs.length > 0) {
    await Notification.insertMany(notificationDocs);
  }

  return NextResponse.json({
    success: true,
    meeting,
    notified: notificationDocs.length,
  });
}
