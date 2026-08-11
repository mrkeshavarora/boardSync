import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";
import { auth } from "@/lib/auth";

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
    message,
  });

  return NextResponse.json({ message: chatMsg }, { status: 201 });
}
