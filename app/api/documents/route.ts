import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MeetingDocument from "@/models/Document";
import { auth } from "@/lib/auth";

import { getAccessibleMeetingIds, canAccessMeeting } from "@/lib/meetingAccess";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const role = session.user.role as UserRole;
  const accessibleIds = await getAccessibleMeetingIds(session.user.id, role);

  let query: any = {};
  if (accessibleIds !== null) {
    const userObjId = new mongoose.Types.ObjectId(session.user.id);
    query = {
      $or: [
        { uploadedBy: userObjId },
        { meetingId: { $in: accessibleIds } },
      ],
    };
  }

  const documents = await MeetingDocument.find(query)
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 });
    
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const role = session.user.role as UserRole;

  if (body.meetingId) {
    const hasAccess = await canAccessMeeting(session.user.id, role, body.meetingId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden — Cannot upload document to a meeting you cannot access" }, { status: 403 });
    }
  }

  await connectDB();
  
  const document = await MeetingDocument.create({
    ...body,
    uploadedBy: session.user.id,
  });

  return NextResponse.json({ document }, { status: 201 });
}
