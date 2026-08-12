import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Group from "@/models/Group";
import GroupMessage from "@/models/GroupMessage";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

// GET /api/groups/[id]/messages — fetch message history
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  // Verify membership
  const isMember = await Group.exists({
    _id: id,
    members: new mongoose.Types.ObjectId(session.user.id),
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await GroupMessage.find({ groupId: id })
    .populate("senderId", "name avatar role")
    .sort({ createdAt: 1 })
    .limit(200);

  return NextResponse.json({ messages });
}

// POST /api/groups/[id]/messages — send a message to the group
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { message } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  await connectDB();

  // Verify membership
  const isMember = await Group.exists({
    _id: id,
    members: new mongoose.Types.ObjectId(session.user.id),
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const msg = await GroupMessage.create({
    groupId: new mongoose.Types.ObjectId(id),
    senderId: new mongoose.Types.ObjectId(session.user.id),
    message: message.trim(),
  });

  const populated = await msg.populate("senderId", "name avatar role");

  // Bump group updatedAt for sort order in sidebar
  await Group.findByIdAndUpdate(id, { updatedAt: new Date() });

  return NextResponse.json({ message: populated }, { status: 201 });
}
