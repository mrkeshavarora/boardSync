import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { updateMeetingSchema } from "@/validations/meeting";

import { canAccessMeeting } from "@/lib/meetingAccess";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const role = session.user.role as UserRole;
  if (!hasPermission(role, "meetings:read") && !hasPermission(role, "meetings:read:invited")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const meetingId = (await params).id;
  await connectDB();

  const hasAccess = await canAccessMeeting(session.user.id, role, meetingId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden — You do not have access to this meeting." }, { status: 403 });
  }

  const meeting = await Meeting.findById(meetingId).populate("organizerId", "name email");
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  return NextResponse.json({ meeting });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const role = session.user.role as UserRole;
  if (!hasPermission(role, "meetings:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const meetingId = (await params).id;
  await connectDB();

  const hasAccess = await canAccessMeeting(session.user.id, role, meetingId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden — You do not have access to this meeting." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateMeetingSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const meeting = await Meeting.findByIdAndUpdate(meetingId, parsed.data, { new: true });
  
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  return NextResponse.json({ meeting });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const meetingId = (await params).id;
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const isOrganizer = meeting.organizerId?.toString() === session.user.id;
  const hasGlobalDelete = hasPermission(session.user.role as UserRole, "meetings:delete");

  if (!isOrganizer && !hasGlobalDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Meeting.findByIdAndDelete(meetingId);
  return NextResponse.json({ success: true });
}
