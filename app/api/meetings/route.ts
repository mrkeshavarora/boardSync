import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { createMeetingSchema } from "@/validations/meeting";
import mongoose from "mongoose";

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

  // If normal user/guest, they should only see meetings they are invited to.
  // For admin/secretary, they can see all.
  // For now, we will fetch all if admin, otherwise we'd need to join with MeetingParticipant.
  // Let's implement a simplified version for Phase 2:
  const query: any = {};
  if (status) query.status = status;

  if (hasPermission(role, "meetings:read")) {
    const meetings = await Meeting.find(query).sort({ createdAt: -1 }).limit(limit).populate("organizerId", "name email");
    return NextResponse.json({ meetings });
  } else {
    // Requires joining with MeetingParticipant - for now return empty or implement basic logic
    // We will expand this in the participant implementation
    return NextResponse.json({ meetings: [] });
  }
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
