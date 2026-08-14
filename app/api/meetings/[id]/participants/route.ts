import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MeetingParticipant from "@/models/MeetingParticipant";
import Meeting from "@/models/Meeting";
import RSVP from "@/models/RSVP";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { canAccessMeeting } from "@/lib/meetingAccess";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const meetingId = (await params).id;
  const role = session.user.role as UserRole;
  await connectDB();
  
  const hasAccess = await canAccessMeeting(session.user.id, role, meetingId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden — You do not have access to this meeting." }, { status: 403 });
  }

  const participants = await MeetingParticipant.find({ meetingId })
    .populate("userId", "name email avatar role");
    
  return NextResponse.json({ participants });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meetingId = (await params).id;
  await connectDB();

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const isOrganizer = meeting.organizerId?.toString() === session.user.id;
  const canUpdate = isOrganizer || hasPermission(session.user.role as UserRole, "meetings:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  // Support both single object { userId, role } or batch array [{ userId, role }]
  const items: Array<{ userId: string; role?: string }> = Array.isArray(body)
    ? body
    : [body];

  const addedParticipants = [];

  for (const item of items) {
    if (!item.userId) continue;

    // Check if participant already exists
    const existing = await MeetingParticipant.findOne({
      meetingId,
      userId: item.userId,
    });

    if (existing) {
      addedParticipants.push(existing);
      continue;
    }

    const participant = await MeetingParticipant.create({
      meetingId,
      userId: item.userId,
      role: item.role || "Attendee",
      invitationStatus: "Pending",
    });

    await RSVP.findOneAndUpdate(
      { meetingId, userId: item.userId },
      { meetingId, userId: item.userId, status: "Pending" },
      { upsert: true }
    );

    addedParticipants.push(participant);
  }

  return NextResponse.json(
    { participants: addedParticipants, count: addedParticipants.length },
    { status: 201 }
  );
}
