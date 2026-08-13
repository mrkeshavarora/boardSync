import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

// Returns the most recent incoming call invite addressed to the current user
// within the last 30 seconds, with caller info.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ call: null });

  await connectDB();

  const since = new Date(Date.now() - 30_000); // 30 second window
  const userObjId = mongoose.Types.ObjectId.isValid(session.user.id)
    ? new mongoose.Types.ObjectId(session.user.id)
    : null;

  const targetIds = [session.user.id, ...(userObjId ? [userObjId] : [])];

  // 1. Check for 1-on-1 calls
  const directMsgs = await ChatMessage.find({
    receiverId: { $in: targetIds },
    message: { $regex: /^\[CALL_INVITE\]:/ },
    createdAt: { $gte: since },
  }).sort({ createdAt: -1 }).lean();

  let directMsg = null;
  for (const msg of directMsgs) {
    const parts = (msg.message as string).split(":");
    const roomName = parts[2];
    
    // Check if this specific call room was ended or declined
    const endedOrDeclined = await ChatMessage.findOne({
      message: { $regex: /^\[(CALL_ENDED|CALL_DECLINED)\]:/ },
      createdAt: { $gte: msg.createdAt },
      $or: [
        { message: { $regex: roomName ? new RegExp(roomName) : /^\[(CALL_ENDED|CALL_DECLINED)\]:/ } },
        { senderId: msg.senderId, receiverId: msg.receiverId },
        { senderId: msg.receiverId, receiverId: msg.senderId },
      ],
    }).lean();

    if (!endedOrDeclined) {
      directMsg = msg;
      break;
    }
  }

  // 2. Check for group calls
  let groupMsg = null;
  let userGroups: any[] = [];
  if (mongoose.connection.models.Group) {
    userGroups = await mongoose.connection.models.Group.find({ members: { $in: targetIds } }).select("_id name").lean();
    const groupIds = userGroups.map((g: any) => g._id);

    if (groupIds.length > 0 && mongoose.connection.models.GroupMessage) {
      groupMsg = await mongoose.connection.models.GroupMessage.findOne({
        groupId: { $in: groupIds },
        senderId: { $nin: targetIds }, // Don't ring if *I* started the call
        message: { $regex: /^\[GROUP_CALL_INVITE\]:/ },
        createdAt: { $gte: since },
      }).sort({ createdAt: -1 }).lean();
    }
  }

  // Determine the latest call
  let latestMsg = null;
  let isGroup = false;

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

  let groupName = null;
  let groupIdStr = null;

  if (isGroup) {
    const g = userGroups.find((g: any) => g._id.equals((latestMsg as any).groupId));
    groupName = g ? g.name : "A Group";
    groupIdStr = (latestMsg as any).groupId.toString();
  }

  // Fetch caller info
  const caller = await User.findById((latestMsg as any).senderId).select("name email avatar role").lean();
  if (!caller) return NextResponse.json({ call: null });

  const parts = ((latestMsg as any).message as string).split(":");
  const callType = (parts[1] || "video") as "voice" | "video";
  const roomName = isGroup ? "" : parts[2] || "";

  return NextResponse.json({
    call: {
      callerId: (caller as any)._id.toString(),
      callerName: (caller as any).name,
      callerAvatar: (caller as any).avatar ?? null,
      callerRole: (caller as any).role || "member",
      type: callType,
      roomName,
      messageId: (latestMsg as any)._id.toString(),
      isGroup,
      groupId: groupIdStr,
      groupName,
    },
  });
}
