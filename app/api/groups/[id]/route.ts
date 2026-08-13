import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Group from "@/models/Group";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

// GET /api/groups/[id] — get group details (must be a member)
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const group = await Group.findOne({
    _id: id,
    members: new mongoose.Types.ObjectId(session.user.id),
  })
    .populate("members", "name email avatar role")
    .populate("createdBy", "name email avatar");

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  return NextResponse.json({ group });
}

// PATCH /api/groups/[id] — update group name, description, or members
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, memberIds } = body;

  await connectDB();

  const group = await Group.findOne({
    _id: id,
    members: new mongoose.Types.ObjectId(session.user.id),
  });

  if (!group) return NextResponse.json({ error: "Group not found or forbidden" }, { status: 404 });

  if (name && name.trim()) {
    group.name = name.trim();
  }
  if (description !== undefined) {
    group.description = description.trim();
  }
  if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
    const allMemberIds = Array.from(
      new Set([session.user.id, ...memberIds])
    ).map((mId) => new mongoose.Types.ObjectId(mId as string));
    group.members = allMemberIds;
  }

  await group.save();

  const populated = await group.populate([
    { path: "members", select: "name email avatar role" },
    { path: "createdBy", select: "name email avatar" },
  ]);

  return NextResponse.json({ group: populated });
}
