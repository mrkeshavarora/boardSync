import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MeetingParticipant from "@/models/MeetingParticipant";
import RSVP from "@/models/RSVP";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";

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
    .populate("userId", "name email avatar");
    
  return NextResponse.json({ participants });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "meetings:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, role } = await request.json();

  await connectDB();
  
  // Create participant and pending RSVP
  const participant = await MeetingParticipant.create({
    meetingId: (await params).id,
    userId,
    role,
    invitationStatus: "Pending",
  });

  await RSVP.create({
    meetingId: (await params).id,
    userId,
    status: "Pending",
  });

  return NextResponse.json({ participant }, { status: 201 });
}
