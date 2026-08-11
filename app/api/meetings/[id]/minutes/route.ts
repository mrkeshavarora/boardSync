import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Minutes from "@/models/Minutes";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";

// GET /api/meetings/[id]/minutes - Get minutes for a meeting
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const minutes = await Minutes.findOne({ meetingId: (await params).id })
    .populate("draftedBy", "name email")
    .populate("approvedBy", "name email");

  if (!minutes) return NextResponse.json({ minutes: null });
  return NextResponse.json({ minutes });
}

// POST /api/meetings/[id]/minutes - Create minutes
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

  const existing = await Minutes.findOne({ meetingId: (await params).id });
  if (existing) {
    return NextResponse.json({ error: "Minutes already exist for this meeting" }, { status: 409 });
  }

  const minutes = await Minutes.create({
    meetingId: (await params).id,
    content: body.content || "",
    status: "Draft",
    draftedBy: new mongoose.Types.ObjectId(session.user.id),
  });

  return NextResponse.json({ minutes }, { status: 201 });
}

// PUT /api/meetings/[id]/minutes - Update minutes content or status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "minutes:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  await connectDB();

  const updateData: any = {};
  if (body.content !== undefined) updateData.content = body.content;
  if (body.status) {
    updateData.status = body.status;
    if (body.status === "Approved") {
      updateData.approvedBy = new mongoose.Types.ObjectId(session.user.id);
      updateData.approvedAt = new Date();
    }
    if (body.status === "Approved" && body.distribute) {
      updateData.distributedAt = new Date();
    }
  }

  const minutes = await Minutes.findOneAndUpdate(
    { meetingId: (await params).id },
    updateData,
    { new: true }
  );

  if (!minutes) return NextResponse.json({ error: "Minutes not found" }, { status: 404 });
  return NextResponse.json({ minutes });
}
