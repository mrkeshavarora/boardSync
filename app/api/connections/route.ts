import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Connection from "@/models/Connection";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";
import Notification from "@/models/Notification";

import ChatMessage from "@/models/ChatMessage";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  await connectDB();

  const userObjectId = new mongoose.Types.ObjectId(session.user.id);
  const query: any = {
    $or: [{ fromUserId: userObjectId }, { toUserId: userObjectId }],
  };
  if (status) query.status = status;

  const [connections, latestMessages] = await Promise.all([
    Connection.find(query)
      .populate("fromUserId", "name email role avatar lastLogin")
      .populate("toUserId", "name email role avatar lastLogin"),
    ChatMessage.aggregate([
      {
        $match: {
          $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", userObjectId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessage: { $first: "$message" },
          lastMessageAt: { $first: "$createdAt" },
        },
      },
    ]),
  ]);

  const messageMap = new Map<string, { lastMessage: string; lastMessageAt: string }>();
  for (const item of latestMessages) {
    if (item._id) {
      messageMap.set(item._id.toString(), {
        lastMessage: item.lastMessage,
        lastMessageAt: item.lastMessageAt ? new Date(item.lastMessageAt).toISOString() : "",
      });
    }
  }

  const mapped = connections.map((connection) => {
    const fromUser = connection.fromUserId as any;
    const toUser = connection.toUserId as any;
    if (!fromUser || !toUser) return null;

    const isOutgoing = fromUser._id?.toString() === session.user.id;
    const otherUser = isOutgoing ? toUser : fromUser;
    const otherUserId = otherUser._id ? otherUser._id.toString() : otherUser.toString();

    const msgInfo = messageMap.get(otherUserId);
    const FIVE_MINUTES = 5 * 60 * 1000;
    const lastActiveTime = otherUser.lastLogin ? new Date(otherUser.lastLogin).getTime() : 0;
    const isOnline = Date.now() - lastActiveTime < FIVE_MINUTES;

    return {
      id: otherUserId,
      name: otherUser.name,
      email: otherUser.email,
      role: otherUser.role,
      avatar: otherUser.avatar ?? null,
      status: connection.status,
      isOnline,
      direction: isOutgoing ? "outgoing" : "incoming",
      connectionId: connection._id.toString(),
      lastMessage: msgInfo?.lastMessage ?? null,
      lastMessageAt: msgInfo?.lastMessageAt || connection.updatedAt.toISOString(),
    };
  }).filter(Boolean);

  // Sort connections by lastMessageAt descending (most recently messaged first)
  mapped.sort((a: any, b: any) => {
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });

  return NextResponse.json({ connections: mapped });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const targetUserId = body?.targetUserId;
  if (!targetUserId) {
    return NextResponse.json({ error: "Target user is required." }, { status: 400 });
  }
  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "You cannot connect with yourself." }, { status: 400 });
  }

  await connectDB();

  const targetUser = await User.findById(targetUserId).select("name email role");
  if (!targetUser) {
    return NextResponse.json({ error: "Target user not found." }, { status: 404 });
  }

  const currentId = new mongoose.Types.ObjectId(session.user.id);
  const targetId = new mongoose.Types.ObjectId(targetUserId);

  const existing = await Connection.findOne({
    $or: [
      { fromUserId: currentId, toUserId: targetId },
      { fromUserId: targetId, toUserId: currentId },
    ],
  });

  if (existing) {
    if (existing.status === "Accepted") {
      return NextResponse.json({ error: "You are already connected." }, { status: 409 });
    }
    if (existing.fromUserId.toString() === targetUserId && existing.status === "Pending") {
      existing.status = "Accepted";
      await existing.save();

      // Create in-app notification for the requester
      await Notification.create({
        userId: targetId,
        type: "connection",
        title: "Connection Request Accepted",
        body: `${session.user.name || "Someone"} accepted your connection request.`,
        link: "/settings?section=connections",
        read: false,
      });

      return NextResponse.json({
        connection: {
          id: targetUser._id.toString(),
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          status: existing.status,
          direction: "incoming",
          connectionId: existing._id.toString(),
        },
      }, { status: 200 });
    }

    return NextResponse.json({
      connection: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        status: existing.status,
        direction: existing.fromUserId.toString() === session.user.id ? "outgoing" : "incoming",
        connectionId: existing._id.toString(),
      },
    }, { status: 200 });
  }

  const connection = await Connection.create({
    fromUserId: currentId,
    toUserId: targetId,
    status: "Pending",
  });

  // Create in-app notification for the target user
  await Notification.create({
    userId: targetId,
    type: "connection",
    title: "Connection Request",
    body: `${session.user.name || "Someone"} sent you a connection request.`,
    link: "/settings?section=connections",
    read: false,
  });

  return NextResponse.json({
    connection: {
      id: targetUser._id.toString(),
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      status: connection.status,
      direction: "outgoing",
      connectionId: connection._id.toString(),
    },
  }, { status: 201 });
}
