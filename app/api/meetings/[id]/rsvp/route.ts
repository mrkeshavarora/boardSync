import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import RSVP, { RSVPStatus } from "@/models/RSVP";
import MeetingParticipant from "@/models/MeetingParticipant";
import Meeting from "@/models/Meeting";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const [userRsvp, rsvps] = await Promise.all([
    RSVP.findOne({ meetingId: params.id, userId: session.user.id }),
    RSVP.find({ meetingId: params.id }).populate("userId", "name email avatar"),
  ]);

  return NextResponse.json({
    userStatus: userRsvp ? userRsvp.status : "Pending",
    rsvps,
  });
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { status } = body as { status: RSVPStatus };

  const validStatuses: RSVPStatus[] = ["Accepted", "Tentative", "Declined", "Pending"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid RSVP status" }, { status: 400 });
  }

  await connectDB();

  // Verify meeting exists
  const meeting = await Meeting.findById(params.id);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Update or create RSVP record for this user
  const rsvp = await RSVP.findOneAndUpdate(
    { meetingId: params.id, userId: session.user.id },
    { status, updatedAt: new Date() },
    { upsert: true, new: true }
  );

  // Ensure user is marked as participant if not already
  const isOrganizer = meeting.organizerId.toString() === session.user.id;
  const participantExists = await MeetingParticipant.findOne({
    meetingId: params.id,
    userId: session.user.id,
  });

  if (!participantExists) {
    await MeetingParticipant.create({
      meetingId: params.id,
      userId: session.user.id,
      role: isOrganizer ? "Organizer" : "Attendee",
      invitationStatus: "Sent",
      respondedAt: new Date(),
    });
  } else {
    await MeetingParticipant.updateOne(
      { meetingId: params.id, userId: session.user.id },
      { respondedAt: new Date() }
    );
  }

  return NextResponse.json({ rsvp, status: rsvp.status });
}
