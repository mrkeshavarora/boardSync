import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MeetingDocument from "@/models/Document";
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

  const documents = await MeetingDocument.find({ meetingId })
    .populate("uploadedBy", "name email");
    
  return NextResponse.json({ documents });
}

export async function POST(
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

  const body = await request.json();

  const document = await MeetingDocument.create({
    ...body,
    meetingId,
    uploadedBy: session.user.id,
  });

  return NextResponse.json({ document }, { status: 201 });
}
