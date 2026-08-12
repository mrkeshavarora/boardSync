import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

// Returns the most recent incoming call invite addressed to the current user
// within the last 20 seconds, with caller info.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ call: null });

  await connectDB();

  const since = new Date(Date.now() - 20_000); // 20 second window
  const userId = new mongoose.Types.ObjectId(session.user.id);

  // 1. Check for 1-on-1 calls
  const directMsg = await ChatMessage.findOne({
    receiverId: userId,
    message: { $regex: /^\[CALL_INVITE\]:/ },
    createdAt: { $gte: since },
  }).sort({ createdAt: -1 }).lean();

  // 2. Check for group calls
  // First find all groups the user is in
  const userGroups = await mongoose.connection.models.Group.find({ members: userId }).select("_id name").lean();
  const groupIds = userGroups.map((g: any) => g._id);

  const groupMsg = await mongoose.connection.models.GroupMessage.findOne({
    groupId: { $in: groupIds },
    senderId: { $ne: userId }, // Don't ring if *I* started the call
    message: { $regex: /^\[GROUP_CALL_INVITE\]:/ },
    createdAt: { $gte: since },
  }).sort({ createdAt: -1 }).lean();

  // Determine the latest call
  let latestMsg = null;
  let isGroup = false;
  let groupName = null;
  let groupIdStr = null;

  if (directMsg && groupMsg) {
    if ((groupMsg as any).createdAt > (directMsg as any).createdAt) {
      latestMsg = groupMsg;
      isGroup = true;
    } else {
      latestMsg = directMsg;
    }
  } else if (groupMsg) {
    latestMsg = groupMsg;
    isGroup = true;
  } else if (directMsg) {
    latestMsg = directMsg;
  }

  if (!latestMsg) return NextResponse.json({ call: null });

  if (isGroup) {
    const g = userGroups.find((g: any) => g._id.equals((latestMsg as any).groupId));
    groupName = g ? g.name : "A Group";
    groupIdStr = (latestMsg as any).groupId.toString();
  }

  // Fetch caller info
  const caller = await User.findById((latestMsg as any).senderId).select("name email avatar role").lean();
  if (!caller) return NextResponse.json({ call: null });

  const parts = ((latestMsg as any).message as string).split(":");
  const callType = parts[1] as "voice" | "video";
  const roomName = isGroup ? "" : parts[2]; // Group calls don't need roomName, they just use the groupId

  return NextResponse.json({
    call: {
      callerId: (caller as any)._id.toString(),
      callerName: (caller as any).name,
      callerAvatar: (caller as any).avatar ?? null,
      callerRole: (caller as any).role,
      type: callType,
      roomName,
      messageId: (latestMsg as any)._id.toString(),
      isGroup,
      groupId: groupIdStr,
      groupName,
    },
  });
}
