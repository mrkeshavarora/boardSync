import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Group from "@/models/Group";
import GroupMessage from "@/models/GroupMessage";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

// POST /api/groups/[id]/call-invite — send a group call invite message
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type } = body; // 'voice' or 'video'
  if (!type || !["voice", "video"].includes(type)) {
    return NextResponse.json({ error: "Valid call type is required" }, { status: 400 });
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
    message: `[GROUP_CALL_INVITE]:${type}`,
  });

  const populated = await msg.populate("senderId", "name avatar role");

  // Bump group updatedAt for sort order in sidebar
  await Group.findByIdAndUpdate(id, { updatedAt: new Date() });

  return NextResponse.json({ message: populated }, { status: 201 });
}
