import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Resolution from "@/models/Resolution";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";

// GET /api/meetings/[id]/resolutions
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const resolutions = await Resolution.find({ meetingId: (await params).id })
    .populate("proposedBy", "name")
    .populate("secondedBy", "name")
    .sort({ createdAt: 1 });

  return NextResponse.json({ resolutions });
}

// POST /api/meetings/[id]/resolutions - Create a resolution
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "minutes:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  await connectDB();

  // Auto-generate resolution number
  const count = await Resolution.countDocuments({ meetingId: (await params).id });
  const year = new Date().getFullYear();
  const resolutionNumber = `RES-${year}-${String(count + 1).padStart(3, "0")}`;

  const resolution = await Resolution.create({
    ...body,
    meetingId: (await params).id,
    resolutionNumber,
    proposedBy: new mongoose.Types.ObjectId(session.user.id),
    status: "Proposed",
  });

  return NextResponse.json({ resolution }, { status: 201 });
}
