import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Group from "@/models/Group";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

// GET /api/groups — list all groups the current user is a member of
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const groups = await Group.find({
    members: new mongoose.Types.ObjectId(session.user.id),
  })
    .populate("members", "name email avatar role")
    .populate("createdBy", "name email avatar")
    .sort({ updatedAt: -1 });

  return NextResponse.json({ groups });
}

// POST /api/groups — create a new group
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, memberIds, description } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }
  if (!memberIds || memberIds.length < 1) {
    return NextResponse.json({ error: "Add at least one member" }, { status: 400 });
  }

  await connectDB();

  // Always include the creator in members
  const allMemberIds = Array.from(
    new Set([session.user.id, ...memberIds])
  ).map((id) => new mongoose.Types.ObjectId(id as string));

  const group = await Group.create({
    name: name.trim(),
    description: description?.trim() || undefined,
    members: allMemberIds,
    createdBy: new mongoose.Types.ObjectId(session.user.id),
  });

  const populated = await group.populate([
    { path: "members", select: "name email avatar role" },
    { path: "createdBy", select: "name email avatar" },
  ]);

  return NextResponse.json({ group: populated }, { status: 201 });
}
