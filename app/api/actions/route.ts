import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ActionItem from "@/models/ActionItem";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";

// GET /api/actions — Get all action items (with optional filters)
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assignedTo");
  const meetingId = searchParams.get("meetingId");

  await connectDB();

  const query: any = {};
  if (status) query.status = status;
  if (assignedTo) query.assignedTo = assignedTo;
  if (meetingId) query.meetingId = meetingId;

  // Non-admins see only their own action items
  if (!hasPermission(session.user.role as UserRole, "actions:read:all")) {
    query.assignedTo = new mongoose.Types.ObjectId(session.user.id);
  }

  const actions = await ActionItem.find(query)
    .populate("assignedTo", "name email avatar")
    .populate("createdBy", "name")
    .populate("meetingId", "title date")
    .sort({ dueDate: 1, priority: -1 });

  return NextResponse.json({ actions });
}

// POST /api/actions — Create an action item
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "actions:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  await connectDB();

  const action = await ActionItem.create({
    ...body,
    createdBy: new mongoose.Types.ObjectId(session.user.id),
    status: "Open",
  });

  return NextResponse.json({ action }, { status: 201 });
}
