import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: meetingId } = await params;
  if (!mongoose.Types.ObjectId.isValid(meetingId)) {
    return NextResponse.json({ error: "Invalid meeting ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { speakerId, speakerName, text, timestamp, startTime, endTime } = body;

    if (!speakerName || !text || !timestamp) {
      return NextResponse.json({ error: "Missing required segment fields" }, { status: 400 });
    }

    await connectDB();

    // Verify meeting exists
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Append segment to transcript
    const updatedMeeting = await Meeting.findByIdAndUpdate(
      meetingId,
      {
        $push: {
          transcript: {
            speakerId: speakerId || null,
            speakerName,
            text,
            timestamp,
            startTime: startTime || null,
            endTime: endTime || null,
          },
        },
      },
      { new: true }
    );

    return NextResponse.json({ success: true, count: updatedMeeting?.transcript?.length || 0 });
  } catch (err: any) {
    console.error("Error saving transcript segment:", err);
    return NextResponse.json({ error: err.message || "Failed to save transcript" }, { status: 500 });
  }
}
