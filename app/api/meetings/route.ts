import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { createMeetingSchema } from "@/validations/meeting";
import mongoose from "mongoose";

import { getAccessibleMeetingIds } from "@/lib/meetingAccess";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const role = session.user.role as UserRole;
  if (!hasPermission(role, "meetings:read") && !hasPermission(role, "meetings:read:invited")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");

  await connectDB();

  const accessibleIds = await getAccessibleMeetingIds(session.user.id, role);
  const query: any = {};
  if (status) query.status = status;
  if (accessibleIds !== null) {
    query._id = { $in: accessibleIds };
  }

  const meetings = await Meeting.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("organizerId", "name email");

  return NextResponse.json({ meetings });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "meetings:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createMeetingSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  
  const meeting = await Meeting.create({
    ...parsed.data,
    organizerId: new mongoose.Types.ObjectId(session.user.id),
    createdBy: new mongoose.Types.ObjectId(session.user.id),
    status: "Scheduled",
  });

  return NextResponse.json({ meeting }, { status: 201 });
}
