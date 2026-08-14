import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { receiverId, message } = body;
  if (!receiverId || !message) {
    return NextResponse.json({ error: "Receiver ID and message are required." }, { status: 400 });
  }

  await connectDB();

  const chatMsg = await ChatMessage.create({
    senderId: session.user.id,
    receiverId,
    message: message.trim(),
  });

  return NextResponse.json({ message: chatMsg }, { status: 201 });
}

// PUT /api/chat — edit user's own sent message
export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { messageId, message } = body;
  if (!messageId || !message?.trim()) {
    return NextResponse.json({ error: "Message ID and updated content are required." }, { status: 400 });
  }

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return NextResponse.json({ error: "Invalid message ID." }, { status: 400 });
  }

  await connectDB();

  // Find message and ensure current user is the author
  const chatMsg = await ChatMessage.findOne({
    _id: new mongoose.Types.ObjectId(messageId),
    senderId: new mongoose.Types.ObjectId(session.user.id),
  });

  if (!chatMsg) {
    return NextResponse.json({ error: "Message not found or you are not authorized to edit it." }, { status: 404 });
  }

  chatMsg.message = message.trim();
  chatMsg.isEdited = true;
  await chatMsg.save();

  return NextResponse.json({ success: true, message: chatMsg });
}
