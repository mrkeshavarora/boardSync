import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  props: { params: Promise<{ userId: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const otherUserId = params.userId;

  await connectDB();

  // Fetch messages between sender and receiver in chronological order
  const messages = await ChatMessage.find({
    $or: [
      { senderId: session.user.id, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: session.user.id },
    ],
  }).sort({ createdAt: 1 });

  // Mark incoming messages as read
  await ChatMessage.updateMany(
    { senderId: otherUserId, receiverId: session.user.id, isRead: false },
    { isRead: true }
  );

  return NextResponse.json({ messages });
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ userId: string }> }
) {
  const params = await props.params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const otherUserId = params.userId;

  await connectDB();

  // Delete all messages between both users in either direction
  await ChatMessage.deleteMany({
    $or: [
      { senderId: session.user.id, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: session.user.id },
    ],
  });

  return NextResponse.json({ success: true });
}
