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

  const msg = await ChatMessage.findOne({
    receiverId: new mongoose.Types.ObjectId(session.user.id),
    message: { $regex: /^\[CALL_INVITE\]:/ },
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!msg) return NextResponse.json({ call: null });

  // Fetch caller info
  const caller = await User.findById(msg.senderId)
    .select("name email avatar role")
    .lean();

  if (!caller) return NextResponse.json({ call: null });

  const parts = (msg.message as string).split(":");
  const callType = parts[1] as "voice" | "video";
  const roomName = parts[2];

  return NextResponse.json({
    call: {
      callerId: (caller as any)._id.toString(),
      callerName: (caller as any).name,
      callerAvatar: (caller as any).avatar ?? null,
      callerRole: (caller as any).role,
      type: callType,
      roomName,
      messageId: (msg as any)._id.toString(),
    },
  });
}
